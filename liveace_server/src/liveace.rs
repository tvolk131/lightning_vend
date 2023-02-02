use serialport::SerialPort;
use std::collections::HashSet;
use std::io::{Read, Write};
use std::time::Duration;

#[derive(serde::Deserialize, Debug)]
struct ArduinoCommandResponse {
    status: String,
    command: String,
    response: Option<serde_json::Value>,
}

#[derive(std::fmt::Debug)]
pub enum SerialError {
    Timeout,
    MalformedResponse,
    NonOkStatus,
    IoError(std::io::Error),
    SerialPortError(serialport::Error),
}

pub struct CallResponseSerialPort {
    port: Box<dyn SerialPort>,
    board_serial_number: String,
    supported_commands: HashSet<String>,
    timeout_to_retry: Duration,
    max_retries: u32,
}

impl CallResponseSerialPort {
    pub fn new(
        port: Box<dyn SerialPort>,
        board_serial_number: String,
    ) -> Result<Self, SerialError> {
        let mut p = Self {
            port,
            board_serial_number,
            supported_commands: HashSet::new(),
            timeout_to_retry: Duration::from_millis(20000),
            max_retries: 10,
        };

        for command in p.get_commands()? {
            p.supported_commands.insert(command);
        }

        Ok(p)
    }

    pub fn get_board_serial_number(&self) -> &str {
        &self.board_serial_number
    }

    fn get_commands(&mut self) -> Result<Vec<String>, SerialError> {
        let response = match self.execute_command("list_commands") {
            Ok(response) => response,
            Err(err) => return Err(err),
        };

        let raw_command_values = match &response {
            Some(res) => match res.as_array() {
                Some(commands) => commands,
                None => return Err(SerialError::MalformedResponse),
            },
            None => return Err(SerialError::MalformedResponse),
        };

        let mut command_strings = Vec::new();
        for raw_command_value in raw_command_values {
            match raw_command_value.as_str() {
                Some(command_string) => command_strings.push(command_string.to_string()),
                None => return Err(SerialError::MalformedResponse),
            };
        }

        Ok(command_strings)
    }

    pub fn get_supported_commands(&self) -> &HashSet<String> {
        &self.supported_commands
    }

    pub fn execute_command(
        &mut self,
        command: &str,
    ) -> Result<Option<serde_json::Value>, SerialError> {
        for _ in 0..self.max_retries {
            if let Ok(response) = self.execute_command_give_up_after_timeout(command) {
                return Ok(response.response);
            }
        }
        self.execute_command_give_up_after_timeout(command)
            .map(|response| response.response)
    }

    fn execute_command_give_up_after_timeout(
        &mut self,
        command: &str,
    ) -> Result<ArduinoCommandResponse, SerialError> {
        let mut buffer = [0; 10000];
        if let Err(err) = self.port.clear(serialport::ClearBuffer::All) {
            return Err(SerialError::SerialPortError(err));
        }
        let num_bytes_available = match self.port.bytes_to_read() {
            Ok(num_bytes_available) => num_bytes_available,
            Err(err) => return Err(SerialError::SerialPortError(err)),
        };
        // Clear out any potential leftover bytes.
        if num_bytes_available > 0 {
            if let Err(err) = self
                .port
                .read(&mut buffer[..(num_bytes_available as usize)])
            {
                return Err(SerialError::IoError(err));
            }
        }

        for char in format!("{command}\n").chars() {
            if let Err(err) = self.port.write_all(format!("{char}").as_bytes()) {
                return Err(SerialError::IoError(err));
            }
            if let Err(err) = self.port.flush() {
                return Err(SerialError::IoError(err));
            }
            std::thread::sleep(Duration::from_millis(1));
        }
        self.wait_for_input(command)
    }

    fn wait_for_input(&mut self, command: &str) -> Result<ArduinoCommandResponse, SerialError> {
        let start_time = std::time::Instant::now();
        let mut buffer = [0; 10000];
        let mut stringified_buffer = String::new();
        loop {
            // TODO - The above call to `bytes_to_read` is very similar and both calls can probably be extracted into a helper of some kind.
            let num_bytes_available = match self.port.bytes_to_read() {
                Ok(num_bytes_available) => num_bytes_available,
                Err(err) => return Err(SerialError::SerialPortError(err)),
            };
            if num_bytes_available > 0 {
                let read_result = self
                    .port
                    .read(&mut buffer[..(num_bytes_available as usize)]);
                match read_result {
                    Ok(bytes_read) => {
                        if let Ok(text) = String::from_utf8(Vec::from(&buffer[..bytes_read])) {
                            stringified_buffer += &text;
                        }
                    }
                    Err(err) => println!("Got error: {}", err),
                };
            }
            if stringified_buffer.ends_with('\n') {
                for line in stringified_buffer.split('\n').map(|line| line.trim()) {
                    match serde_json::from_str::<ArduinoCommandResponse>(line) {
                        Ok(response) => {
                            if response.status != "ok" {
                                return Err(SerialError::NonOkStatus);
                            }

                            if response.command == command {
                                return Ok(response);
                            }
                        }
                        Err(_) => return Err(SerialError::MalformedResponse),
                    };
                }
            }
            if std::time::Instant::now().duration_since(start_time) > self.timeout_to_retry {
                return Err(SerialError::Timeout);
            }
            if let Err(err) = self.port.clear(serialport::ClearBuffer::Output) {
                return Err(SerialError::SerialPortError(err));
            }
        }
    }
}
