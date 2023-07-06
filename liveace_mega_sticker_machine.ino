/*
  Arduino Program that interfaces using LiVeACE (LightningVend Arduino Command Execution) protocol
  to control 2 stepper motors that each have a homing switch and inventory sensor. Currently only
  designed for and tested on an Arduino Mega.
*/

#include <Stepper.h>

// --- Configuration ---

// The number of steps the stepper motors take to complete one revolution.
// This is determined by the stepper motors used and is not configurable.
// This value is equal to 360 / step angle.
// For 1.8 degree stepper motors, this is 200.
// For 0.9 degree stepper motors, this is 400.
const int stepsPerRevolution = 200;
// The number of revolutions the motor needs to turn to vend a sticker.
// Configure to your liking so that the machine vends properly without
// overshooting or undershooting.
const int revolutionsPerVend = 22;
// How fast the motor controller will drive the stepper motors. Configure to
// your liking. Too fast and the motor may skip steps, stall, or not have enough
// torque. Too slow and the machine will take longer to vend and may be noisy
// due to resonance from starting and stopping at each step.
const int motorRpm = 300;
// The state of the homing switch when it is unpressed.
// Use `LOW` for normally open switches and `HIGH` for normally closed switches.
const int homingSwitchUnpressedState = HIGH;

// TODO - Figure out why the pins need to be out of order and if we can fix this. If we can't fix
// this, then we need to document why.
Stepper stepper0(stepsPerRevolution, 39, 43, 41, 45);
// TODO - Put these in an array and loop through them.
const int stepper0PowerPin0 = 35;
const int stepper0PowerPin1 = 37;
const int stepper0HomingSensorPin = 2;
const int stepper0InventorySensorPin = 53;

// TODO - Figure out why the pins need to be out of order and if we can fix this. If we can't fix
// this, then we need to document why.
Stepper stepper1(stepsPerRevolution, 38, 42, 40, 44);
// TODO - Put these in an array and loop through them.
const int stepper1PowerPin0 = 34;
const int stepper1PowerPin1 = 36;
const int stepper1HomingSensorPin = 8;
const int stepper1InventorySensorPin = 52;

// --------------------------------------
//    END OF CONFIGURATION, BEGIN CODE
// DO NOT MODIFY ANYTHING BELOW THIS LINE
//   UNLESS YOU KNOW WHAT YOU ARE DOING
// --------------------------------------

// The amount of time in milliseconds it takes to fully retract the motor after
// vending. Only counts the time the motor moves in one direction. Used to
// calculate the maximum amount of time to wait for the homing switch to be
// pressed before giving up. Let's break down the math:
//
// (milliseconds per second) * (seconds per minute) *
// (revolutions per vend) / (motor revolutions per minute).
//
// (milliseconds per second) * (seconds per minute) = (milliseconds per minute).
// (revolutions per vend) / (motor revolutions per minute) = (minutes per vend).
//
// So this simplifies to:
// (milliseconds per minute) * (minutes per vend).
//
// Which finally simplifies to:
// (milliseconds per vend).
const int millisecondsPerVendRetraction = 1000 * 60 * revolutionsPerVend / motorRpm;
// The maximum amount of time in milliseconds to wait for the homing switch to be pressed.
// This is to prevent the machine from getting stuck in an infinite loop in case the homing switch
// is broken. We add a little extra time just in case.
const int homingTimeoutMs = millisecondsPerVendRetraction + 100;

// Global buffer for reading commands from the serial port.
String command;

void setup() {
  Serial.begin(57600);
  Serial.setTimeout(500);

  // Setup stepper motor 0.
  stepper0.setSpeed(motorRpm);
  pinMode(stepper0InventorySensorPin, INPUT);
  pinMode(stepper0HomingSensorPin, INPUT);
  pinMode(stepper0PowerPin0, OUTPUT);
  pinMode(stepper0PowerPin1, OUTPUT);
  // Stepper motor is off unless moving. This is to prevent the motor and
  // controller from getting hot when the machine is idle.
  digitalWrite(stepper0PowerPin0, LOW);
  digitalWrite(stepper0PowerPin1, LOW);

  // Setup stepper motor 1.
  stepper1.setSpeed(motorRpm);
  pinMode(stepper1InventorySensorPin, INPUT);
  pinMode(stepper1HomingSensorPin, INPUT);
  pinMode(stepper1PowerPin0, OUTPUT);
  pinMode(stepper1PowerPin1, OUTPUT);
  // Stepper motor is off unless moving. This is to prevent the motor and
  // controller from getting hot when the machine is idle.
  digitalWrite(stepper1PowerPin0, LOW);
  digitalWrite(stepper1PowerPin1, LOW);
}

void loop() {
  // TODO - Add helper function to generate JSON responses.
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
// hits the homing switch again. The homing ensures any previous drift is
// corrected, and that the stepper motor is in a known position for the next
// vend. Returns true if the homing switch was triggered, false if the homing
// switch was not triggered within the timeout period for either of the two
// homing switch checks.
bool moveStepper(Stepper& stepper, int homingSensorPin, int powerPin0, int powerPin1) {
  // Power on stepper motor coils.
  digitalWrite(powerPin0, HIGH);
  digitalWrite(powerPin1, HIGH);

  // Turn the stepper motor backwards until it hits the homing switch. This
  // initial homing ensures any previous drift is corrected, which is important
  // because:
  //   * The stepper motor is not powered when idle, allowing for small drift over time.
  //   * The Arduino could have previously lost power while the stepper motor was in an
  //     unknown position (e.g. due to a power outage in the middle of a vend).
  bool homingSucceeded = homeStepper(stepper, homingSensorPin, powerPin0, powerPin1);
  if (!homingSucceeded) {
    // Power off stepper motor coils.
    digitalWrite(powerPin0, LOW);
    digitalWrite(powerPin1, LOW);
    return false;
  }

  // Turn the stepper motor forward to vend the product.
  stepper.step(-stepsPerRevolution * revolutionsPerVend);

  // Turn the stepper motor backwards until it hits the homing switch again.
  // This final homing ensures the stepper motor is immediately ready for the
  // next vend.
  homingSucceeded = homeStepper(stepper, homingSensorPin, powerPin0, powerPin1);
  if (!homingSucceeded) {
    // Power off stepper motor coils.
    digitalWrite(powerPin0, LOW);
    digitalWrite(powerPin1, LOW);
    return false;
  }

  // Power off stepper motor coils.
  digitalWrite(powerPin0, LOW);
  digitalWrite(powerPin1, LOW);
  return true;
}

// Moves the stepper motor backwards until it hits the homing switch. Returns
// true if the homing switch was triggered, false if the homing switch was not
// triggered within the timeout period. The timeout is used to prevent the
// stepper motor from running forever if the homing switch is not triggered,
// which could happen if the homing switch is broken or disconnected.
// Note: The stepper motor must be powered on before calling this function.
bool homeStepper(Stepper& stepper, int homingSensorPin, int powerPin0, int powerPin1) {
  // Timeout is used to prevent the stepper motor from running forever if the
  // homing switch is not triggered.
  unsigned long timeoutStartMs = millis();
  while (digitalRead(homingSensorPin) == homingSwitchUnpressedState && millis() - timeoutStartMs < homingTimeoutMs) {
    stepper.step(10);
  }

  if (digitalRead(homingSensorPin) == homingSwitchUnpressedState) {
    // Homing switch not triggered within timeout period.
    return false;
  }

  return true;
}
