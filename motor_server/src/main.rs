#[macro_use]
extern crate rocket;

use rocket::State;
use std::sync::Mutex;

mod vend_coil;

#[get("/spinMotor")]
fn spin_motor_handler(
    vend_coil: &State<Mutex<vend_coil::VendCoil>>,
) -> rocket::response::content::Plain<String> {
    vend_coil.lock().unwrap().rotate().unwrap();
    rocket::response::content::Plain("Test response".to_string())
}

#[rocket::launch]
async fn rocket() -> _ {
    println!("Bootstrapping stepper motors...");
    let vend_coil = vend_coil::VendCoil::new(vend_coil::StepperMotor::Stepper1).unwrap();
    println!("Starting server...");
    rocket::build()
        .manage(Mutex::from(vend_coil))
        .mount("/", routes![spin_motor_handler])
}
