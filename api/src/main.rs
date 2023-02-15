mod proto;
mod service;

use proto::lightning_vend::admin_service_server::AdminServiceServer;
use proto::lightning_vend::device_service_server::DeviceServiceServer;
use service::{AdminServiceImpl, DeviceServiceImpl};
use tonic::transport::Server;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port: u16 = 50052;
    let address = format!("0.0.0.0:{port}").parse().unwrap();

    println!("Starting server on port {port}...");
    Server::builder()
        .accept_http1(true)
        // TODO - Restrict CORS to limited domains based on environment
        // variable using `allow_origins()` instead of `allow_all_origins()`.
        // For prod we should set it to https://lightningvend.com/.
        .add_service(
            tonic_web::config()
                .allow_all_origins()
                .enable(AdminServiceServer::new(AdminServiceImpl::new())),
        )
        .add_service(
            tonic_web::config()
                .allow_all_origins()
                .enable(DeviceServiceServer::new(DeviceServiceImpl::new())),
        )
        .serve(address)
        .await?;

    Ok(())
}
