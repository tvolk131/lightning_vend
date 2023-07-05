/*
  Arduino Program that interfaces using LiVeACE (LightningVend Arduino Command Execution) protocol
  to control 2 stepper motors that each have a homing switch and inventory sensor. Currently only
  designed for and tested on an Arduino Mega.
*/

#include <Stepper.h>

const int stepsPerRevolution = 200;
const int revolutionsPerVend = 22;
const int motorSpeed = 330;
// The `digitalRead()` state of the homing switch when it is unpressed.
// This is `HIGH` because the homing switch is normally closed.
const int homingSwitchUnpressedState = HIGH;

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
  // Stepper motor is off unless we are moving it.
  digitalWrite(stepper0PowerPin0, LOW);
  digitalWrite(stepper0PowerPin1, LOW);

  stepper1.setSpeed(motorSpeed);
  pinMode(stepper1InventorySensorPin, INPUT);
  pinMode(stepper1HomingSensorPin, INPUT);
  pinMode(stepper1PowerPin0, OUTPUT);
  pinMode(stepper1PowerPin1, OUTPUT);
  // Stepper motor is off unless we are moving it.
  digitalWrite(stepper1PowerPin0, LOW);
  digitalWrite(stepper1PowerPin1, LOW);
}

void loop() {
  if (Serial.available()) {
    command = Serial.readStringUntil('\n');
    command.trim();
    if (command.equals("listCommands")) {
      Serial.println("{\"status\": \"ok\", \"command\": \"listCommands\", \"response\": {\"undefined\": [\"stepper0\", \"stepper1\"], \"boolean\": [\"stepper0Inventory\", \"stepper1Inventory\"]}}");
    } else if (command.equals("stepper0")) {
      bool stepperSucceeded = moveStepper(stepper0, stepper0HomingSensorPin, stepper0PowerPin0, stepper0PowerPin1);
      if (stepperSucceeded) {
        Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\", \"response\": undefined}");
      } else {
        Serial.println("{\"status\": \"error\", \"command\": \"" + command + "\", \"response\": \"stepper0 homing switch not triggered\"}");
      }
    } else if (command.equals("stepper1")) {
      bool stepperSucceeded = moveStepper(stepper1, stepper1HomingSensorPin, stepper1PowerPin0, stepper1PowerPin1);
      if (stepperSucceeded) {
        Serial.println("{\"status\": \"ok\", \"command\": \"" + command + "\"}, \"response\": undefined}");
      } else {
        Serial.println("{\"status\": \"error\", \"command\": \"" + command + "\", \"response\": \"stepper1 homing switch not triggered\"}");
      }
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

// Moves the stepper motor backwards until it hits the homing switch, then
// forward by a hardcoded amount to vend the product, then backwards until it
// hits the homing switch again. Returns true if the homing switch was
// triggered, false if the homing switch was not triggered within the timeout
// period for either of the two homing switch checks.
bool moveStepper(Stepper& stepper, int homingSensorPin, int powerPin0, int powerPin1) {
  // Start sending power to both stepper motor coils.
  digitalWrite(powerPin0, HIGH);
  digitalWrite(powerPin1, HIGH);

  // Turn the stepper motor backwards until it hits the homing switch.
  bool homingSucceeded = homeStepper(stepper, homingSensorPin, powerPin0, powerPin1);
  if (!homingSucceeded) {
    return false;
  }

  // Turn the stepper motor forward by a hardcoded amount to vend the product.
  stepper.step(-stepsPerRevolution * revolutionsPerVend);

  // Turn the stepper motor backwards until it hits the homing switch.
  homingSucceeded = homeStepper(stepper, homingSensorPin, powerPin0, powerPin1);
  if (!homingSucceeded) {
    return false;
  }

  // Stop sending power to both stepper motor coils.
  digitalWrite(powerPin0, LOW);
  digitalWrite(powerPin1, LOW);

  return true;
}

// Moves the stepper motor backwards until it hits the homing switch. Returns
// true if the homing switch was triggered, false if the homing switch was not
// triggered within the timeout period. The stepper motor must be powered on
// before calling this function.
bool homeStepper(Stepper& stepper, int homingSensorPin, int powerPin0, int powerPin1) {
  // Turn the stepper motor backwards until it hits the homing switch.
  unsigned long timeoutStart = millis();
  // Timeout after 5 seconds.
  while (digitalRead(homingSensorPin) == homingSwitchUnpressedState && millis() - timeoutStart < 5000) {
    stepper.step(10);
  }

  if (digitalRead(homingSensorPin) == homingSwitchUnpressedState) {
    // Homing switch not triggered within the timeout period.
    // Handle the error or take appropriate action.
    return false;
  }

  return true;
}
