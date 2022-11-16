#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_invoice])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn get_invoice() -> String {
    String::from("lightning:lnbc10u1p3hgmlfpp554ufwa2uaa69uz27t9u6hr8yrskju7mxeqksjdmldpa20rh60lnqdqqcqzpgxqr23ssp55u85dejctg2dln8ff94rrtfjxy7xxk4nehzv7v2uetj4kpp2k5vs9qyyssq3zudhexj3x68n4jydplwpyezjxu8au5ydv9zr50l4gccrp7dzw650nve3jgnayc5e0zfu4vzyt2ktvz7tkpmenm9tzk4vtfnvyrzqcqpj53v9k")
}
