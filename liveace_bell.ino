/*
  Arduino Program that interfaces using LiVeACE 1.0 (LightningVend Arduino
  Command Execution) protocol to ring a bell.
*/

const int solenoidPin = 7;
const int solenoidRunTimeMillis = 10;

// Global buffer for reading commands from the serial port.
String command;

void setup() {
  pinMode(solenoidPin, OUTPUT);
  Serial.begin(57600);
  Serial.setTimeout(500);
}

void loop() {
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    command.trim();
    if (command.equals("listCommands")) {
      printJsonResponse(
        true,
        "{\"null\": [\"bell\"], "
         "\"boolean\": []}");
    } else if (command.equals("bell")) {
      digitalWrite(solenoidPin, HIGH);
      delay(solenoidRunTimeMillis);
      digitalWrite(solenoidPin, LOW);
      printJsonSuccessNullResponse();
    } else {
      printJsonErrorResponse("unknown command: `" + command + "`.");
    }
  }
}

void printJsonResponse(bool isOk, String response) {
  String status = isOk ? "ok" : "error";
  Serial.println(
    "{\"status\": \"" + status + "\", " +
     "\"command\": \"" + command + "\", " +
     "\"response\": " + response + "}");
}

void printJsonSuccessNullResponse() {
  printJsonResponse(true, "null");
}

void printJsonErrorResponse(String errorMessage) {
  printJsonResponse(false, "\"" + errorMessage + "\"");
}
