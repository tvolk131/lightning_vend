use crate::command_executor::{CommandExecutor, NamespacedCommandExecutor};
use adafruit_motorkit::{
    init_pwm,
    stepper::{StepDirection, StepStyle},
    Motor, MotorError,
};
use pwm_pca9685::Pca9685;
use std::error::Error;

pub struct AdafruitMotorHat {
    pwm: Pca9685<linux_embedded_hal::I2cdev>,
    stepper1: adafruit_motorkit::stepper::StepperMotor,
    stepper2: adafruit_motorkit::stepper::StepperMotor,
}

impl CommandExecutor for AdafruitMotorHat {
    fn get_commands(&self) -> Box<dyn Iterator<Item = &str> + '_> {
        Box::from(vec!["stepper1", "stepper2"].into_iter())
    }

    fn execute_command(&mut self, command: &str) -> Result<(), Box<dyn Error>> {
        if command == "stepper1" {
            return self.rotate_stepper1().map_err(Box::from);
        }

        if command == "stepper2" {
            return self.rotate_stepper2().map_err(Box::from);
        }

        Err(Box::from("Unknown command"))
    }
}

impl NamespacedCommandExecutor for AdafruitMotorHat {
    fn get_executor_namespace(&self) -> &str {
        "adafruit_motorkit"
    }
}

impl AdafruitMotorHat {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        let mut pwm = init_pwm(None)?;
        let stepper1 =
            adafruit_motorkit::stepper::StepperMotor::try_new(&mut pwm, Motor::Stepper1, None)?;
        let stepper2 =
            adafruit_motorkit::stepper::StepperMotor::try_new(&mut pwm, Motor::Stepper2, None)?;
        Ok(Self {
            pwm,
            stepper1,
            stepper2,
        })
    }

    fn rotate_stepper1(&mut self) -> Result<(), MotorError> {
        for _ in 0..400 {
            self.stepper1.step_once(
                &mut self.pwm,
                StepDirection::Forward,
                StepStyle::Interleave,
            )?;
        }
        Ok(())
    }

    fn rotate_stepper2(&mut self) -> Result<(), MotorError> {
        for _ in 0..400 {
            self.stepper2.step_once(
                &mut self.pwm,
                StepDirection::Forward,
                StepStyle::Interleave,
            )?;
        }
        Ok(())
    }
}
