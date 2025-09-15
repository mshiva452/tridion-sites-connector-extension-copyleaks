import { useEffect, useState } from "react";
import { IdentifiableObject, TcmUri } from "@tridion-sites/models";
import { ItemsService } from "@tridion-sites/open-api-client"
import { ComponentData } from "src/data/types";
import { getConfiguration } from "@globals";

import CopyleaksAction from "./CopyleaksAction";
import apiClient from "src/api/apiClient";

interface InBundlePanelProps {
    item: IdentifiableObject;
}

const CopyleaksDashboard = ({ item }: InBundlePanelProps) => {
    const configurationObj = getConfiguration();
    const EMAIL = configurationObj && configurationObj['EMAIL'] as string;  
    const API_KEY = configurationObj && configurationObj['API_KEY'] as string; 
    const PROXY_SERVER_BASE_URL = configurationObj && configurationObj['PROXY_SERVER_BASE_URL'] as string;

    const copyleaksClient = new apiClient(PROXY_SERVER_BASE_URL as string);

    const [isLoading, setIsLoading]= useState<boolean>(false)
    const [accessToken, setAcccessToken] = useState<string | null>(null)
    const [scanId, setScanId] = useState<string>("")
    const [erroMsg, setErrorMsg]= useState<string>("Awaiting webhook response for the scan results")
    const [componentData, setComponentData] = useState<ComponentData>({
        title: "",
        content: ""
    });
    useEffect(() => {
        const access_token = copyleaksClient.getToken();
        if(access_token!==null){
            
            const currentTime = new Date().getTime();
            const tokenDate = access_token[".expires"];
            const TokenTime = new Date(tokenDate).getTime()
            const isTokenExpired = currentTime > TokenTime
            if(!access_token || isTokenExpired){
                getAccessToken()
            }
        } else {
            getAccessToken()
        }
    }, [])

    useEffect(() => {
        
        setIsLoading(true)
        const tcmid = item.id.asString;
        getItems(tcmid as string)
       
    }, [item])

    const getAccessToken = async () => {
        const acess_token = await copyleaksClient.authentication(EMAIL as string, API_KEY as string);
        setAcccessToken(acess_token.access_token);
    }

    const getItems = (tcmid:string) => {
       // const response = await ItemsService.getItem({ escapedItemId: tcmid, useDynamicVersion: false })
        //if(response){
            ItemsService.getItem({ escapedItemId: tcmid, useDynamicVersion: false }).then((response) => {
                const data = JSON.stringify(response);
                const componentData = JSON.parse(data)
                if (componentData) {
                    if(componentData.Content.hasOwnProperty("content")){
                        setComponentData({
                            title: response.Title as string,
                            content: componentData?.Content.content
                        })
                    }
                    else if (componentData.Content.hasOwnProperty("itemListElement")) {
                        setComponentData({
                            title: response.Title as string,
                            content: componentData?.Content.itemListElement[0].content
                        })
                    } else if (componentData.Content.hasOwnProperty("articleBody")) {
                        setComponentData({
                            title: response.Title as string,
                            content: componentData?.Content.articleBody[0].content
                        })
                    } else if(componentData.Content.hasOwnProperty("body")){
                        setComponentData({
                            title: response.Title as string,
                            content: componentData?.Content.body[0].content
                        })
                    }
                    const scanId = response?.Title?.split(" ").join("_").toLowerCase().slice(0, 35);
                    //const scanId = response?.Title?.split(" ").join("").toLowerCase(); 
                    if (scanId) {
                        setScanId(scanId)
                        resendScanResults(scanId as string)
                    }
                    setIsLoading(false)
                }
    
            }).catch((error) => {
                console.log(error)
                setIsLoading(false)
            })
        //}
    }

    const  resendScanResults = async(scanId:string) => {
        try{
            const response:any = await copyleaksClient.get(`/resend/${scanId}`);
            
            if(response.status===202){
                setErrorMsg("The Scan request has been accepted. The scan result will be available shortly.")
            }
        }catch(error:any){
            if(error?.status===404){
                setErrorMsg("This item has not yet been scanned for copyleaks.")
            } else if(error?.status===400){
                setErrorMsg("The scan is not ready yet. Please wait for the scan to complete.")
            }
        }
    }
    return (
        <CopyleaksAction scanId={scanId} componentData={componentData} isLoading={isLoading} errorMsg={erroMsg} />
    )
}

export default CopyleaksDashboard;