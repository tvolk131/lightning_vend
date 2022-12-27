use adafruit_motorkit::{
    init_pwm,
    stepper::{StepDirection, StepStyle},
    Motor, MotorError,
};
use pwm_pca9685::Pca9685;
use std::error::Error;

pub enum StepperMotor {
    Stepper1,
    // Stepper2, // TODO - Uncomment this when we support multiple motors.
}

impl StepperMotor {
    fn to_adafruit_stepper_motor(&self) -> Motor {
        match self {
            Self::Stepper1 => Motor::Stepper1,
            // Self::Stepper2 => Motor::Stepper2,
        }
    }
}

pub struct VendCoil {
    pwm: Pca9685<linux_embedded_hal::I2cdev>,
    stepper: adafruit_motorkit::stepper::StepperMotor,
}

impl VendCoil {
    pub fn new(motor: StepperMotor) -> Result<Self, Box<dyn Error>> {
        let mut pwm = init_pwm(None)?;
        let stepper = adafruit_motorkit::stepper::StepperMotor::try_new(
            &mut pwm,
            motor.to_adafruit_stepper_motor(),
            None,
        )?;
        Ok(Self { pwm, stepper })
    }

    pub fn rotate(&mut self) -> Result<(), MotorError> {
        for _ in 0..400 {
            self.stepper
                .step_once(&mut self.pwm, StepDirection::Forward, StepStyle::Interleave)?;
        }
        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), MotorError> {
        self.stepper.stop(&mut self.pwm)
    }
}
