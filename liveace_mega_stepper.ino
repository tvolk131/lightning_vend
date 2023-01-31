/*
  Arduino Program that interfaces using LiVeACE (LightningVend Arduino Command Execution) protocol
  to control up to 13 stepper motors. Currently only designed for and tested on an Arduino Mega.
  TODO - Add compatibility for Uno and Leonardo.
*/

#include <Stepper.h>

const int stepsPerRevolution = 200;
const int motorSpeed = 60;

String command;

// TODO - See if we can convert these into a global array.
Stepper stepper0 = Stepper(stepsPerRevolution, 2, 3, 4, 5);
Stepper stepper1 = Stepper(stepsPerRevolution, 6, 7, 8, 9);
Stepper stepper2 = Stepper(stepsPerRevolution, 10, 11, 12, 13);
Stepper stepper3 = Stepper(stepsPerRevolution, 14, 15, 16, 17);
Stepper stepper4 = Stepper(stepsPerRevolution, 18, 19, 20, 21);
Stepper stepper5 = Stepper(stepsPerRevolution, 22, 23, 24, 25);
Stepper stepper6 = Stepper(stepsPerRevolution, 26, 27, 28, 29);
Stepper stepper7 = Stepper(stepsPerRevolution, 30, 31, 32, 33);
Stepper stepper8 = Stepper(stepsPerRevolution, 34, 35, 36, 37);
Stepper stepper9 = Stepper(stepsPerRevolution, 38, 39, 40, 41);
Stepper stepper10 = Stepper(stepsPerRevolution, 42, 43, 44, 45);
Stepper stepper11 = Stepper(stepsPerRevolution, 46, 47, 48, 49);
Stepper stepper12 = Stepper(stepsPerRevolution, 50, 51, 52, 53);

void setup() {
  Serial.begin(57600);
  Serial.setTimeout(500);

  stepper0.setSpeed(motorSpeed);
  stepper1.setSpeed(motorSpeed);
  stepper2.setSpeed(motorSpeed);
  stepper3.setSpeed(motorSpeed);
  stepper4.setSpeed(motorSpeed);
  stepper5.setSpeed(motorSpeed);
  stepper6.setSpeed(motorSpeed);
  stepper7.setSpeed(motorSpeed);
  stepper8.setSpeed(motorSpeed);
  stepper9.setSpeed(motorSpeed);
  stepper10.setSpeed(motorSpeed);
  stepper11.setSpeed(motorSpeed);
  stepper12.setSpeed(motorSpeed);
}

void loop() {
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    command.trim();
    if (command.equals("list_commands")) {
      Serial.println("{\"status\": \"ok\", \"command\": \"list_commands\", \"response\": [\"stepper0\", \"stepper1\", \"stepper2\", \"stepper3\", \"stepper4\", \"stepper5\", \"stepper6\", \"stepper7\", \"stepper8\", \"stepper9\", \"stepper10\", \"stepper11\", \"stepper12\"]}");
    } else if (command.equals("stepper0")) {
      stepper0.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper1")) {
      stepper1.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper2")) {
      stepper2.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper3")) {
      stepper3.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper4")) {
      stepper4.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper5")) {
      stepper5.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper6")) {
      stepper6.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper7")) {
      stepper7.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper8")) {
      stepper8.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper9")) {
      stepper9.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper10")) {
      stepper10.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper11")) {
      stepper11.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper12")) {
      stepper12.step(stepsPerRevolution);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else {
      Serial.println("{\"status\": \"error\", \"command\": \"" + command + "\", \"response\": \"unknown command: `" + command + "`\"}");
    }
  }
}