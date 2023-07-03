/*
  Arduino Program that interfaces using LiVeACE (LightningVend Arduino Command Execution) protocol
  to control 2 stepper motors that each have a homing switch and inventory sensor. Currently only
  designed for and tested on an Arduino Mega.
*/

#include <Stepper.h>

const int stepsPerRevolution = 200;
const int revolutionsPerVend = 22;
const int motorSpeed = 330;

String command;

Stepper stepper0 = Stepper(stepsPerRevolution, 39, 43, 41, 45);
int stepper0InventorySensorPin = 53;
int stepper0PowerPin0 = 35;
int stepper0PowerPin1 = 37;
int stepper0HomingSensorPin = 33;

Stepper stepper1 = Stepper(stepsPerRevolution, 38, 42, 40, 44);
int stepper1InventorySensorPin = 52;
int stepper1PowerPin0 = 34;
int stepper1PowerPin1 = 36;
int stepper1HomingSensorPin = 27;

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

void loop() {
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    command.trim();
    if (command.equals("list_commands")) {
      Serial.println("{\"status\": \"ok\", \"command\": \"list_commands\", \"response\": [\"stepper0\", \"stepper1\"]}");
    } else if (command.equals("stepper0")) {
      // Start sending power to both stepper motor coils.
      digitalWrite(stepper0PowerPin0, HIGH);
      digitalWrite(stepper0PowerPin1, HIGH);

      // Turn the stepper motor backwards until it hits the homing switch.
      int stepper0HomingSensorOn = digitalRead(stepper0HomingSensorPin);
      while (stepper0HomingSensorOn == 0) {
        stepper0.step(10);
        stepper0HomingSensorOn = digitalRead(stepper0HomingSensorPin);
      }

      // Turn the stepper motor forward by a hardcoded amount to vend the product.
      stepper0.step(-stepsPerRevolution * revolutionsPerVend);

      // Turn the stepper motor backwards until it hits the homing switch.
      stepper0HomingSensorOn = digitalRead(stepper0HomingSensorPin);
      while (stepper0HomingSensorOn == 0) {
        stepper0.step(10);
        stepper0HomingSensorOn = digitalRead(stepper0HomingSensorPin);
      }

      // Stop sending power to both stepper motor coils.
      digitalWrite(stepper0PowerPin0, LOW);
      digitalWrite(stepper0PowerPin1, LOW);

      // Return response to the COM port.
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper1")) {
      // Start sending power to both stepper motor coils.
      digitalWrite(stepper1PowerPin0, HIGH);
      digitalWrite(stepper1PowerPin1, HIGH);

      // Turn the stepper motor backwards until it hits the homing switch.
      int stepper1HomingSensorOn = digitalRead(stepper1HomingSensorPin);
      while (stepper1HomingSensorOn == 0) {
        stepper1.step(10);
        stepper1HomingSensorOn = digitalRead(stepper1HomingSensorPin);
      }

      // Turn the stepper motor forward by a hardcoded amount to vend the product.
      stepper1.step(-stepsPerRevolution * revolutionsPerVend);

      // Turn the stepper motor backwards until it hits the homing switch.
      stepper1HomingSensorOn = digitalRead(stepper1HomingSensorPin);
      while (stepper1HomingSensorOn == 0) {
        stepper1.step(10);
        stepper1HomingSensorOn = digitalRead(stepper1HomingSensorPin);
      }

      // Stop sending power to both stepper motor coils.
      digitalWrite(stepper1PowerPin0, LOW);
      digitalWrite(stepper1PowerPin1, LOW);

      // Return response to the COM port.
      Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}");
    } else if (command.equals("stepper0Inventory")) {
      String response = "{\"status\": \"ok\", \"command\": \"" + command + "\", \"response\": ";
      bool stepper0Inventory = digitalRead(stepper0InventorySensorPin);
      if (stepper0Inventory) {
        response += "true";
      } else {
        response += "false";
      }
      response += "}";
      Serial.println(response);
    } else if (command.equals("stepper1Inventory")) {
      String response = "{\"status\": \"ok\", \"command\": \"" + command + "\", \"response\": ";
      bool stepper1Inventory = digitalRead(stepper1InventorySensorPin);
      if (stepper1Inventory) {
        response += "true";
      } else {
        response += "false";
      }
      response += "}";
      Serial.println(response);
    } else {
      Serial.println("{\"status\": \"error\", \"command\": \"" + command + "\", \"response\": \"unknown command: `" + command + "`\"}");
    }
  }
}