/*
  Arduino Program that interfaces using LiVeACE (LightningVend Arduino Command Execution) protocol
  to control 2 stepper motors that each have a homing switch and inventory sensor. Currently only
  designed for and tested on an Arduino Mega.
*/

#include <Stepper.h>

const int stepsPerRevolution = 200;
const int revolutionsPerVend = 22;
const int motorSpeed = 330;

Stepper stepper0 = Stepper(stepsPerRevolution, 39, 43, 41, 45);
const int stepper0PowerPin0 = 35;
const int stepper0PowerPin1 = 37;
const int stepper0HomingSensorPin = 33;
const int stepper0InventorySensorPin = 53;

Stepper stepper1 = Stepper(stepsPerRevolution, 38, 42, 40, 44);
const int stepper1PowerPin0 = 34;
const int stepper1PowerPin1 = 36;
const int stepper1HomingSensorPin = 27;
const int stepper1InventorySensorPin = 52;

String command;

void setup() {
  Serial.begin(57600);
  Serial.setTimeout(500);

  stepper0.setSpeed(motorSpeed);
  pinMode(stepper0InventorySensorPin, INPUT);
  pinMode(stepper0HomingSensorPin, INPUT);
  pinMode(stepper0PowerPin0, OUTPUT);
  pinMode(stepper0PowerPin1, OUTPUT);

  stepper1.setSpeed(motorSpeed);
  pinMode(stepper1InventorySensorPin, INPUT);
  pinMode(stepper1HomingSensorPin, INPUT);
  pinMode(stepper1PowerPin0, OUTPUT);
  pinMode(stepper1PowerPin1, OUTPUT);
}

void moveStepper(Stepper& stepper, int homingSensorPin, int powerPin0, int powerPin1) {
  // Start sending power to both stepper motor coils.
  digitalWrite(powerPin0, HIGH);
  digitalWrite(powerPin1, HIGH);

  // Turn the stepper motor backwards until it hits the homing switch.
  int homingSensorOn = digitalRead(homingSensorPin);
  while (homingSensorOn == 0) {
    stepper.step(10);
    homingSensorOn = digitalRead(homingSensorPin);
  }

  // Turn the stepper motor forward by a hardcoded amount to vend the product.
  stepper.step(-stepsPerRevolution * revolutionsPerVend);

  // Turn the stepper motor backwards until it hits the homing switch.
  homingSensorOn = digitalRead(homingSensorPin);
  while (homingSensorOn == 0) {
    stepper.step(10);
    homingSensorOn = digitalRead(homingSensorPin);
  }

  // Stop sending power to both stepper motor coils.
  digitalWrite(powerPin0, LOW);
  digitalWrite(powerPin1, LOW);
}

void loop() {
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    command.trim();
    if (command.equals("list_commands")) {
      Serial.println("{\"status\": \"ok\", \"command\": \"list_commands\", \"response\": [\"stepper0\", \"stepper1\"]}");
    } else if (command.equals("stepper0")) {
      moveStepper(stepper0, stepper0HomingSensorPin, stepper0PowerPin0, stepper0PowerPin1);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper1")) {
      moveStepper(stepper1, stepper1HomingSensorPin, stepper1PowerPin0, stepper1PowerPin1);
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper0Inventory")) {
      String response = "{\"status\": \"ok\", \"command\": \"" + command + "\", \"response\": ";
      bool stepper0Inventory = digitalRead(stepper0InventorySensorPin);
      response += stepper0Inventory ? "true" : "false";
      response += "}";
      Serial.println(response);
    } else if (command.equals("stepper1Inventory")) {
      String response = "{\"status\": \"ok\", \"command\": \"" + command + "\", \"response\": ";
      bool stepper1Inventory = digitalRead(stepper1InventorySensorPin);
      response += stepper1Inventory ? "true" : "false";
      response += "}";
      Serial.println(response);
    } else {
      Serial.println("{\"status\": \"error\", \"command\": \"" + command + "\", \"response\": \"unknown command: `" + command + "`\"}");
    }
  }
}
