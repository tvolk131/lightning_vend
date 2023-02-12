mod proto;

use async_mutex::Mutex;
use neon::prelude::*;
use once_cell::sync::Lazy;
use proto::lnrpc::{lightning_client::LightningClient, Invoice};
use std::error::Error;
use std::ops::DerefMut;
use std::path::Path;
use std::path::PathBuf;
use tokio::runtime::Runtime;
use tonic::transport::{Certificate, Channel, ClientTlsConfig};

static RUNTIME: Lazy<Runtime> = Lazy::new(|| Runtime::new().unwrap());
static LN_GRPC_CLIENT: Lazy<
    Mutex<
        Option<
            LightningClient<
                tonic::service::interceptor::InterceptedService<Channel, MacaroonInterceptor>,
            >,
        >,
    >,
> = Lazy::new(|| Mutex::from(None));

struct MacaroonInterceptor {
    macaroon: String,
}

async fn load_macaroon(path: impl AsRef<Path> + Into<PathBuf>) -> String {
    let macaroon = tokio::fs::read(&path).await.unwrap();
    hex::encode(&macaroon)
}

impl tonic::service::Interceptor for MacaroonInterceptor {
    fn call(
        &mut self,
        mut request: tonic::Request<()>,
    ) -> Result<tonic::Request<()>, tonic::Status> {
        request.metadata_mut().insert(
            "macaroon",
            tonic::metadata::MetadataValue::from_str(&self.macaroon)
                .expect("Hex produced non-ascii"),
        );
        Ok(request)
    }
}

fn init(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let (deferred, promise) = cx.promise();
    let channel = cx.channel();

    RUNTIME.spawn(async move {
        let mut lock = LN_GRPC_CLIENT.lock().await;

        if lock.is_some() {
            channel.send(move |mut cx| {
                let undefined = cx.undefined();
                deferred.resolve(&mut cx, undefined);

                Ok(())
            });
        } else {
            match std::fs::read_to_string("./config/tls.cert") {
                Ok(pem) => {
                    let ca = Certificate::from_pem(pem);
                    let tls = ClientTlsConfig::new().ca_certificate(ca);
                    match Channel::from_static("https://lightningvend.m.voltageapp.io:10009")
                        .tls_config(tls)
                        .unwrap()
                        .connect()
                        .await
                    {
                        Ok(c) => {
                            let macaroon = load_macaroon("./config/admin.macaroon").await;
                            let interceptor = MacaroonInterceptor { macaroon };
                            let lightning_client =
                                LightningClient::with_interceptor(c, interceptor);
                            *lock = Some(lightning_client);
                            channel.send(move |mut cx| {
                                let undefined = cx.undefined();
                                deferred.resolve(&mut cx, undefined);

                                Ok(())
                            });
                        }
                        Err(err) => {
                            channel.send(move |mut cx| {
                                let s = cx.string(format!("{:?}", err.source()));
                                deferred.reject(&mut cx, s);

                                Ok(())
                            });
                        }
                    };
                }
                Err(err) => {
                    channel.send(move |mut cx| {
                        let s = cx.string(format!("{:?}", err));
                        deferred.reject(&mut cx, s);

                        Ok(())
                    });
                }
            };
        }
    });

    Ok(promise)
}

fn add_invoice(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let (deferred, promise) = cx.promise();
    let channel = cx.channel();

    let value_sats = match cx.argument::<JsNumber>(0) {
        Ok(value_sats) => value_sats.value(&mut cx) as i64,
        Err(err) => {
            let s = cx.string("Function arg at index 0 is missing or incorrect type");
            deferred.reject(&mut cx, s);
            return Ok(promise);
        }
    };

    let expiry_seconds = match cx.argument::<JsNumber>(1) {
        Ok(expiry_seconds) => expiry_seconds.value(&mut cx) as i64,
        Err(err) => {
            let s = cx.string("Function arg at index 1 is missing or incorrect type");
            deferred.reject(&mut cx, s);
            return Ok(promise);
        }
    };

    RUNTIME.spawn(async move {
        let mut lock = LN_GRPC_CLIENT.lock().await;

        if let Some(ln_grpc_client) = lock.deref_mut() {
            let mut invoice = Invoice::default();
            invoice.value = value_sats;
            invoice.expiry = expiry_seconds;
            match ln_grpc_client.add_invoice(invoice).await {
                Ok(res) => {
                    channel.send(move |mut cx| {
                        match serde_json::to_string(res.get_ref()) {
                            Ok(stringified_response) => {
                                let s = cx.string(stringified_response);
                                deferred.resolve(&mut cx, s);
                            }
                            Err(err) => {
                                let s = cx.string(format!("{err}"));
                                deferred.reject(&mut cx, s);
                            }
                        };

                        Ok(())
                    });
                }
                Err(err) => {
                    channel.send(move |mut cx| {
                        let s = cx.string(format!("{:?}", err));
                        deferred.reject(&mut cx, s);

                        Ok(())
                    });
                }
            };
        } else {
            channel.send(move |mut cx| {
                let s = cx.string("Client is uninitialized");
                deferred.reject(&mut cx, s);

                Ok(())
            });
        }
    });

    Ok(promise)
}

register_module!(mut cx, {
    cx.export_function("init", init)?;
    cx.export_function("addInvoice", add_invoice)?;
    Ok(())
});
