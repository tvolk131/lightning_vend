#[macro_use]
extern crate rocket;
use std::time::Duration;
use serialport::{SerialPortInfo, SerialPortType, UsbPortInfo};
mod liveace;
use liveace::CallResponseSerialPort;
use rocket::State;
use std::sync::Mutex;

#[get("/commands/<board_serial_id>/<command>")]
fn run_command_handler(
    board_serial_id: String,
    command: String,
    arduino_command_ports: &State<Mutex<Vec<CallResponseSerialPort>>>,
) -> Result<rocket::response::content::Json<Option<String>>, rocket::response::status::NotFound<String>> {
    let mut unlocked_ports = arduino_command_ports.lock().unwrap();
    let port = match unlocked_ports.iter_mut().find(|port| port.get_board_serial_id() == board_serial_id) {
        Some(port) => port,
        None => return Err(rocket::response::status::NotFound("Board serial id does not match any connected board".to_string()))
    };

    match port.execute_command(&command) {
        Ok(res) => {
            Ok(rocket::response::content::Json(res.map(|json| json.to_string())))
        },
        Err(err) => {
            // TODO - NotFound isn't always going to be the right response here. Let's take more care to make sure we always return a relevant HTTP status code.
            Err(rocket::response::status::NotFound(format!("{:?}", err)))
        }
    }
}

#[get("/listCommands")]
fn list_commands_handler(arduino_command_ports: &State<Mutex<Vec<CallResponseSerialPort>>>) -> rocket::response::content::Json<String> {
    let mut commands: Vec<String> = Vec::new();
    let unlocked_ports = arduino_command_ports.lock().unwrap();
    for port in unlocked_ports.iter() {
        for command in port.get_supported_commands() {
            commands.push(format!("{}/{}", port.get_board_serial_id(), command));
        }
    }
    commands.sort();
    return rocket::response::content::Json(serde_json::json!(commands).to_string());
}

#[rocket::launch]
async fn rocket() -> _ {
    println!("Bootstrapping Arduino...");
    let mut arduino_command_ports = Vec::new();
    // TODO - Spawn a thread for each call to `try_get_call_response_serial_port_from_serial_port_info` since they all block. Then join on all of the handles.
    for port_info in serialport::available_ports().unwrap_or_default() {
        if let Some(call_response_serial_port) = try_get_call_response_serial_port_from_serial_port_info(port_info) {
            arduino_command_ports.push(call_response_serial_port);
        }
    }
    println!("Starting server...");
    rocket::build()
        .manage(Mutex::from(arduino_command_ports))
        .mount("/", routes![run_command_handler, list_commands_handler])
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

    let board_serial_id = match &usb_port_info.serial_number {
        Some(board_serial_id) => board_serial_id,
        None => return None
    };

    match CallResponseSerialPort::new(port, board_serial_id.clone()) {
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
