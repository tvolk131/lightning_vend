#[macro_use]
extern crate rocket;
use serialport::{SerialPortInfo, SerialPortType, UsbPortInfo};
use std::time::Duration;
mod command_executor;
use command_executor::liveace::LiVeAceSerialPort;
use command_executor::{CommandExecutor, CommandExecutorManager, NamespacedCommandExecutor};
use rocket::{
    fairing::{Fairing, Info, Kind},
    http::Header,
    Request, Response, State,
};
use std::sync::Mutex;

#[get("/nullCommands/<command>")]
fn run_null_command_handler(
    command: String,
    command_executor_manager_mutex: &State<Mutex<CommandExecutorManager>>,
) -> Result<rocket::response::content::Json<String>, rocket::response::status::NotFound<String>> {
    let mut command_executor_manager = command_executor_manager_mutex.lock().unwrap();

    match command_executor_manager.execute_null_command(&command) {
        Ok(_) => Ok(rocket::response::content::Json(
            serde_json::json!(null).to_string(),
        )),
        Err(err) => {
            // TODO - NotFound isn't always going to be the right response here. Let's take more care to make sure we always return a relevant HTTP status code.
            Err(rocket::response::status::NotFound(format!("{err:?}")))
        }
    }
}

#[get("/boolCommands/<command>")]
fn run_bool_command_handler(
    command: String,
    command_executor_manager_mutex: &State<Mutex<CommandExecutorManager>>,
) -> Result<rocket::response::content::Json<String>, rocket::response::status::NotFound<String>> {
    let mut command_executor_manager = command_executor_manager_mutex.lock().unwrap();

    match command_executor_manager.execute_bool_command(&command) {
        Ok(bool_res) => Ok(rocket::response::content::Json(
            serde_json::json!(bool_res).to_string(),
        )),
        Err(err) => {
            // TODO - NotFound isn't always going to be the right response here. Let's take more care to make sure we always return a relevant HTTP status code.
            Err(rocket::response::status::NotFound(format!("{err:?}")))
        }
    }
}

#[get("/listCommands")]
fn list_commands_handler(
    command_executor_manager_mutex: &State<Mutex<CommandExecutorManager>>,
) -> rocket::response::content::Json<String> {
    let command_executor_manager = command_executor_manager_mutex.lock().unwrap();

    let mut null_commands: Vec<&str> = command_executor_manager.get_null_commands().collect();
    null_commands.sort();

    let mut bool_commands: Vec<&str> = command_executor_manager.get_bool_commands().collect();
    bool_commands.sort();

    rocket::response::content::Json(
        serde_json::json!({
            "nullCommands": null_commands,
            "boolCommands": bool_commands
        })
        .to_string(),
    )
}

struct Cors;

#[rocket::async_trait]
impl Fairing for Cors {
    fn info(&self) -> Info {
        Info {
            name: "Add CORS headers to responses",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _request: &'r Request<'_>, response: &mut Response<'r>) {
        response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
        response.set_header(Header::new(
            "Access-Control-Allow-Methods",
            "POST, GET, PATCH, OPTIONS",
        ));
        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}

#[rocket::launch]
async fn rocket() -> _ {
    let mut command_executors: Vec<Box<dyn NamespacedCommandExecutor>> = Vec::new();

    println!("Bootstrapping Arduino(s)...");
    // TODO - Spawn a thread for each call to `try_get_call_response_serial_port_from_serial_port_info` since they all block. Then join on all of the handles.
    for port_info in serialport::available_ports().unwrap_or_default() {
        if let Some(call_response_serial_port) =
            try_get_call_response_serial_port_from_serial_port_info(port_info)
        {
            command_executors.push(Box::from(call_response_serial_port));
        }
    }

    println!("Starting server...");
    rocket::build()
        .manage(Mutex::from(
            CommandExecutorManager::new(command_executors).unwrap(),
        ))
        .configure(rocket::Config {
            port: 21000,
            ..Default::default()
        })
        .attach(Cors)
        .mount(
            "/",
            routes![
                run_null_command_handler,
                run_bool_command_handler,
                list_commands_handler
            ],
        )
}

fn try_get_call_response_serial_port_from_serial_port_info(
    serial_port_info: SerialPortInfo,
) -> Option<LiVeAceSerialPort> {
    let usb_port_info = match &serial_port_info.port_type {
        SerialPortType::UsbPort(usb_port_info) => usb_port_info,
        _ => return None,
    };

    if get_board_type(usb_port_info) == ArduinoBoardType::Unknown {
        return None;
    }

    let port_builder = serialport::new(&serial_port_info.port_name, 57600)
        .timeout(Duration::from_millis(1))
        .data_bits(serialport::DataBits::Eight);

    let port = match port_builder.open() {
        Ok(port) => port,
        Err(_) => return None,
    };

    let board_serial_number = match &usb_port_info.serial_number {
        Some(board_serial_number) => board_serial_number,
        None => return None,
    };

    match LiVeAceSerialPort::new(port, board_serial_number.clone()) {
        Ok(call_response_serial_port) => Some(call_response_serial_port),
        Err(_) => None,
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
