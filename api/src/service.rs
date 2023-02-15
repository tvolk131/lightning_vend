use super::proto::google::protobuf::Empty;
use super::proto::lightning_vend::admin_service_server::AdminService;
use super::proto::lightning_vend::device_service_server::DeviceService;
use crate::proto::lightning_vend::{DeviceUpdate, ListDevicesRequest, ListDevicesResponse};
use futures::Stream;
use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{Response, Status};

pub struct AdminServiceImpl {}

impl AdminServiceImpl {
    pub fn new() -> Self {
        Self {}
    }
}

#[tonic::async_trait]
impl AdminService for AdminServiceImpl {
    async fn list_devices(
        &self,
        request: tonic::Request<ListDevicesRequest>,
    ) -> Result<tonic::Response<ListDevicesResponse>, Status> {
        Err(Status::unimplemented("RPC is unimplemented."))
    }
}

pub struct DeviceServiceImpl {}

impl DeviceServiceImpl {
    pub fn new() -> Self {
        Self {}
    }
}

#[tonic::async_trait]
impl DeviceService for DeviceServiceImpl {
    type SubscribeToDeviceUpdatesStream =
        Pin<Box<dyn Stream<Item = Result<DeviceUpdate, Status>> + Send>>;

    async fn subscribe_to_device_updates(
        &self,
        request: tonic::Request<Empty>,
    ) -> Result<tonic::Response<Self::SubscribeToDeviceUpdatesStream>, Status> {
        let (tx, rx) = mpsc::channel(128);

        tokio::spawn(async move {
            for _ in 1..20 {
                match tx.send(Result::<_, Status>::Ok(DeviceUpdate {})).await {
                    Ok(_) => {
                        println!("Device update was sent to client!");
                    }
                    Err(_) => {
                        println!("Device update failed to send!");
                    }
                }
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
        });

        Ok(Response::new(
            Box::pin(ReceiverStream::new(rx)) as Self::SubscribeToDeviceUpdatesStream
        ))
    }
}
