#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

// TODO - Remove this once we can connect to a lightning node.
const INVOICE: &str = "lightning:lnbc10u1p3hgmlfpp554ufwa2uaa69uz27t9u6hr8yrskju7mxeqksjdmldpa20rh60lnqdqqcqzpgxqr23ssp55u85dejctg2dln8ff94rrtfjxy7xxk4nehzv7v2uetj4kpp2k5vs9qyyssq3zudhexj3x68n4jydplwpyezjxu8au5ydv9zr50l4gccrp7dzw650nve3jgnayc5e0zfu4vzyt2ktvz7tkpmenm9tzk4vtfnvyrzqcqpj53v9k";

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            std::thread::spawn(move || {
                loop {
                    // TODO - Remove this and actually implement this
                    // thread loop once we can connect to a lightning node.
                    std::thread::sleep(std::time::Duration::from_secs(10));
                    handle.emit_all("on_invoice_paid", INVOICE).unwrap();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_invoice])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_invoice() -> String {
    // TODO - Remove this mock value and actually implement this
    // function once we can connect to a lightning node.
    String::from(INVOICE)
}
