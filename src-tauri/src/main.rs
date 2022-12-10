#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use futures::lock::Mutex;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tauri::{Manager, State};
use tonic_lnd::lnrpc::Invoice;

#[cfg(feature = "stepper-motor")]
mod vend_coil;

#[tokio::main]
async fn main() {
    // TODO - Find a better way to handle switching between testnet and prod.
    // let mut lnd = tonic_lnd::connect("https://pivendtestnet.t.voltageapp.io:10009", "./testnet.tls.cert", "./testnet.admin.macaroon").await.unwrap();
    let mut lnd = tonic_lnd::connect(
        "https://lightningvend.m.voltageapp.io:10009",
        "./tls.cert",
        "./admin.macaroon",
    )
    .await
    .unwrap();

    let mut invoice_stream = lnd
        .lightning()
        .subscribe_invoices(tonic_lnd::lnrpc::InvoiceSubscription {
            add_index: 1, // TODO - Find out why we can't set this to zero - it hangs if we do.
            settle_index: 0,
        })
        .await
        .expect("Failed to call subscribe_invoices")
        .into_inner();

    let tracked_payment_requests = TrackedPaymentRequests {
        payment_requests: Arc::from(Mutex::from(HashSet::new())),
    };
    let tracked_payment_requests_clone = tracked_payment_requests.clone();

    let builder;

    #[cfg(feature = "stepper-motor")]
    {
        builder = tauri::Builder::default().manage(std::sync::Mutex::from(
            vend_coil::VendCoil::new(vend_coil::StepperMotor::Stepper1).unwrap(),
        ));
    }

    #[cfg(not(feature = "stepper-motor"))]
    {
        builder = tauri::Builder::default();
    }

    builder
        .manage(WrappedLndClient {
            mutex: Mutex::from(lnd),
        })
        .manage(tracked_payment_requests)
        .setup(|app| {
            let handle = app.handle();
            tokio::spawn(async move {
                while let Some(invoice) = invoice_stream
                    .message()
                    .await
                    // TODO - This fails when the computer goes to sleep for a while and wakes up later. Let's handle the failure and attempt to reconnect here.
                    .expect("Failed to receive invoices")
                {
                    if let Some(state) =
                        tonic_lnd::lnrpc::invoice::InvoiceState::from_i32(invoice.state)
                    {
                        if state == tonic_lnd::lnrpc::invoice::InvoiceState::Settled
                            && tracked_payment_requests_clone
                                .payment_requests
                                .lock()
                                .await
                                .contains(&invoice.payment_request)
                        {
                            println!("Invoice for {} sats was paid!", invoice.value);
                            handle
                                .emit_all(
                                    "on_invoice_paid",
                                    format!("lightning:{}", invoice.payment_request),
                                )
                                .unwrap();
                            #[cfg(feature = "stepper-motor")]
                            {
                                let vend_coil: State<'_, std::sync::Mutex<vend_coil::VendCoil>> =
                                    handle.state();
                                vend_coil.lock().unwrap().rotate().unwrap();
                            }
                        }
                    }
                }
            });
            println!("Done starting up with LND!");
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                #[cfg(feature = "stepper-motor")]
                {
                    let vend_coil: State<'_, std::sync::Mutex<vend_coil::VendCoil>> =
                        event.window().state();
                    vend_coil.lock().unwrap().stop().unwrap();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_invoice])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

struct WrappedLndClient {
    mutex: Mutex<tonic_lnd::Client>,
}

#[derive(Clone)]
struct TrackedPaymentRequests {
    payment_requests: Arc<Mutex<HashSet<String>>>,
}

fn create_invoice(value_sat: i64) -> Invoice {
    #[allow(deprecated)] // We must set all fields in this struct, even if they are deprecated.
    tonic_lnd::lnrpc::Invoice {
        memo: String::from(""),
        r_preimage: Vec::new(),
        r_hash: Vec::new(),
        value: value_sat,
        value_msat: 0,
        settled: false,
        creation_date: 0,
        settle_date: 0,
        payment_request: String::from(""),
        description_hash: Vec::new(),
        expiry: 0,
        fallback_addr: String::from(""),
        cltv_expiry: 0,
        route_hints: Vec::new(),
        private: false,
        add_index: 0,
        settle_index: 0,
        amt_paid: 0,
        amt_paid_sat: 0,
        amt_paid_msat: 0,
        state: 0,
        htlcs: Vec::new(),
        features: HashMap::new(),
        is_keysend: false,
        payment_addr: Vec::new(),
        is_amp: false,
        amp_invoice_state: HashMap::new(),
    }
}

#[tauri::command]
async fn get_invoice(
    wrapped_lnd_client: State<'_, WrappedLndClient>,
    tracked_payment_requests: State<'_, TrackedPaymentRequests>,
) -> Result<String, ()> {
    let response = wrapped_lnd_client
        .mutex
        .lock()
        .await
        .lightning()
        .add_invoice(create_invoice(10))
        .await
        .map_err(|_| (()))?;
    let payment_request = response.into_inner().payment_request;
    tracked_payment_requests
        .payment_requests
        .lock()
        .await
        .insert(payment_request.clone());
    Ok(format!("lightning:{}", payment_request))
}
