#[macro_use]
extern crate rocket;
use std::{collections::HashMap, time::Duration};
use serialport::{SerialPortInfo, SerialPortType, UsbPortInfo};
mod liveace;
use liveace::CallResponseSerialPort;
use rocket::State;
use std::sync::Mutex;

#[get("/commands/<command>")]
fn spin_motor_handler(
    command: String,
    vend_coil: &State<Mutex<CallResponseSerialPort>>,
) -> rocket::response::content::Plain<String> {
    vend_coil.lock().unwrap().execute_command(&command).unwrap();
    rocket::response::content::Plain("Test response".to_string())
}

#[rocket::launch]
async fn rocket() -> _ {
    println!("Bootstrapping Arduino...");
    let mut arduino_command_port = None;
    for port_info in serialport::available_ports().unwrap() {
        if let Some(call_response_serial_port) = try_get_call_response_serial_port_from_serial_port_info(port_info) {
            arduino_command_port = Some(call_response_serial_port);
        }
    }
    println!("Starting server...");
    rocket::build()
        .manage(Mutex::from(arduino_command_port.unwrap()))
        .mount("/", routes![spin_motor_handler])
}

fn try_get_call_response_serial_port_from_serial_port_info(serial_port_info: SerialPortInfo) -> Option<CallResponseSerialPort> {
    let usb_port_info = match &serial_port_info.port_type {
        SerialPortType::UsbPort(usb_port_info) => usb_port_info,
        _ => return None
    };

    if get_board_type(usb_port_info) == ArduinoBoardType::Unknown {
        return None;
    }

    let port_builder = serialport::new(&serial_port_info.port_name, 57600)
        .timeout(Duration::from_millis(1))
        .data_bits(serialport::DataBits::Eight);

    let port = match port_builder.open() {
        Ok(port) => port,
        Err(_) => return None
    };

    match CallResponseSerialPort::new(port) {
        Ok(call_response_serial_port) => Some(call_response_serial_port),
        Err(_) => None
    }
}

fn get_board_type(usb_port_info: &UsbPortInfo) -> ArduinoBoardType {
    // 9025 is the decimal version of 2341.
    // See https://devicehunt.com/view/type/usb/vendor/2341 for board
    // number references, and remember to convert from hex to decimal.
    if usb_port_info.vid != 9025 {
        return ArduinoBoardType::Unknown;
    }

    if usb_port_info.pid == 66 {
        return ArduinoBoardType::Mega2560;
    }

    ArduinoBoardType::Unknown
}

#[derive(PartialEq, std::fmt::Debug)]
enum ArduinoBoardType {
    Unknown,
    Mega2560,
}
