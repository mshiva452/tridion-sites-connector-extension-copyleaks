import { useEffect, useState } from "react";
import { Button, Flex, Skeleton } from "antd";
import { ComponentData, IScanResult } from "src/data/types";
import { getConfiguration } from "@globals";

import apiClient from "src/api/apiClient";
import ScanResults from "./ScanResults";

interface ICopyLeaksProps {
    scanId:string;
    componentData:ComponentData;
    isLoading:boolean;
    errorMsg:string
}

const CopyleaksAction = ({componentData, scanId, isLoading,errorMsg}: ICopyLeaksProps) => {
    const configurationObj = getConfiguration();
    const WEB_HOOKS_URL = configurationObj && configurationObj['WEB_HOOKS_URL'] as string;  
    const WEB_HOOKS_NEWRESULT = configurationObj && configurationObj['WEB_HOOKS_NEWRESULT'] as string;
    const PROXY_SERVER_BASE_URL = configurationObj && configurationObj['PROXY_SERVER_BASE_URL'] as string; 

    const copyleaksClient = new apiClient(PROXY_SERVER_BASE_URL as string);

    const [scanResult, setScanResult] = useState<IScanResult | null>(null);
    const [isProcessing, setsProcessing] = useState<boolean>(false);
    
    const ws = new WebSocket("ws://localhost:5000");
    useEffect(() => {
        
        ws.onopen = () => console.log('connected');
        ws.onclose = () => console.log('disconnected');
        ws.onerror = (err) => console.log("ws error");
        ws.onmessage = (event) => {
            console.log("Message from server:", event.data);
            const data = JSON.parse(event.data);
            if (data.scannedDocument.scanId === scanId) {
                setScanResult(data)
                setsProcessing(false)
            }
        }
        return () => {
            ws.close();
        };

    }, [scanId])

    useEffect(() => {
        setScanResult(null)
    },[scanId])

    const scanComponent = async() => {
        setsProcessing(true)
        try{
           
            const data = {
                "base64": btoa(unescape(encodeURIComponent(componentData.content))),    //Need to fix unescape depricated method,
                "filename": `${scanId}.txt`,
                "properties": {
                    "webhooks": {
                        "status": WEB_HOOKS_URL,
                        "newResult":  WEB_HOOKS_NEWRESULT                
                    }
                }
            }
            const response = await copyleaksClient.post(`/scan/${scanId}`, data);
            
            setsProcessing(false)
        }catch(error){
            setsProcessing(false)
            console.log("Failed to scan the component for copyleaks",error)
        }
    }
    return (
        <Flex vertical>
            <Flex justify="space-between" align="center">
                <Button style={{width:"100%"}} onClick={scanComponent} disabled={isProcessing || scanResult!=null} title="Copyleaks Scan for Component" loading={isProcessing}>
                    Scan Component
                </Button>
            </Flex>
            {
                isLoading ? 
                <>
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                </>
                :
                <ScanResults scanId={scanId} scanResult={scanResult as IScanResult} isProcessing={isProcessing} errorMsg={errorMsg}/>
            }
            
        </Flex>
    )
}

export default CopyleaksAction;