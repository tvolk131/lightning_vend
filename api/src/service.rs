use super::proto::google::protobuf::Empty;
use super::proto::lightning_vend::{
    lightning_vend_service_server::LightningVendService, CreateDeviceRequest,
    CreatePurchaseOrderRequest, DeleteDeviceRequest, Device, GetDeviceRequest,
    GetOrCreateUserRequest, ListDevicesRequest, ListDevicesResponse, ListPurchaseOrdersRequest,
    ListPurchaseOrdersResponse, MarkPurchaseOrderFailedRequest, MarkPurchaseOrderSucceededRequest,
    PurchaseOrder, SubscribePurchaseOrderPaymentsRequest, UpdateDeviceRequest,
    UpdatePurchaseOrderRequest, User,
};
use futures::Stream;
use std::pin::Pin;
use tonic::{Request, Response, Status};

pub struct LightningVendServiceImpl {
}

impl LightningVendServiceImpl {
    pub fn new() -> Self {
        Self {}
    }
}

#[tonic::async_trait]
impl LightningVendService for LightningVendServiceImpl {
    type SubscribePurchaseOrderPaymentsStream =
        Pin<Box<dyn Stream<Item = Result<PurchaseOrder, Status>> + Send>>;

    async fn get_device(
        &self,
        request: Request<GetDeviceRequest>,
    ) -> Result<Response<Device>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn list_devices(
        &self,
        request: Request<ListDevicesRequest>,
    ) -> Result<Response<ListDevicesResponse>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn create_device(
        &self,
        request: Request<CreateDeviceRequest>,
    ) -> Result<Response<Device>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn update_device(
        &self,
        request: Request<UpdateDeviceRequest>,
    ) -> Result<Response<Device>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn delete_device(
        &self,
        request: Request<DeleteDeviceRequest>,
    ) -> Result<Response<Empty>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn list_purchase_orders(
        &self,
        request: Request<ListPurchaseOrdersRequest>,
    ) -> Result<Response<ListPurchaseOrdersResponse>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn create_purchase_order(
        &self,
        request: Request<CreatePurchaseOrderRequest>,
    ) -> Result<Response<PurchaseOrder>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn update_purchase_order(
        &self,
        request: Request<UpdatePurchaseOrderRequest>,
    ) -> Result<Response<PurchaseOrder>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn get_or_create_user(
        &self,
        request: Request<GetOrCreateUserRequest>,
    ) -> Result<Response<User>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn mark_purchase_order_succeeded(
        &self,
        request: Request<MarkPurchaseOrderSucceededRequest>,
    ) -> Result<Response<PurchaseOrder>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn mark_purchase_order_failed(
        &self,
        request: Request<MarkPurchaseOrderFailedRequest>,
    ) -> Result<Response<PurchaseOrder>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }

    async fn subscribe_purchase_order_payments(
        &self,
        request: Request<SubscribePurchaseOrderPaymentsRequest>,
    ) -> Result<tonic::Response<Self::SubscribePurchaseOrderPaymentsStream>, Status> {
        Err(Status::unimplemented("RPC is not yet implemented."))
    }
}
