#[macro_use]
extern crate rocket;

use rocket::State;
use std::sync::Mutex;

mod vend_coil;

#[get("/commands/stepper0")]
fn run_command_handler(
    vend_coil: &State<Mutex<vend_coil::VendCoil>>,
) -> Result<rocket::response::content::Plain<String>, rocket::response::status::Custom<String>> {
    match vend_coil.lock().unwrap().rotate() {
        Ok(_) => Ok(rocket::response::content::Plain("Success!".to_string())),
        Err(err) => Err(rocket::response::status::Custom(
            rocket::http::Status::InternalServerError,
            format!("Failed to execute action: {}", err),
        )),
    }
}

#[get("/listCommands")]
fn list_commands_handler() -> rocket::response::content::Json<String> {
    rocket::response::content::Json(serde_json::json!(vec!("stepper0")).to_string())
}

#[rocket::launch]
async fn rocket() -> _ {
    println!("Bootstrapping stepper motors...");
    let vend_coil = vend_coil::VendCoil::new(vend_coil::StepperMotor::Stepper1).unwrap();
    println!("Starting server...");
    rocket::build()
        .manage(Mutex::from(vend_coil))
        .configure(rocket::Config {
            port: 21000,
            ..Default::default()
        })
        .mount("/", routes![run_command_handler, list_commands_handler])
}
