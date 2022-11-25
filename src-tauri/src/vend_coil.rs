use adafruit_motorkit::{
    init_pwm,
    stepper::{StepDirection, StepStyle},
    Motor,
};
use pwm_pca9685::Pca9685;
use std::error::Error;
use std::sync::mpsc::{channel, Receiver, Sender, TryRecvError};
use std::thread::{sleep, spawn, JoinHandle};
use std::time::Duration;
use std::sync::Mutex;
 
pub enum StepperMotor {
    Stepper1,
    Stepper2,
}
 
impl StepperMotor {
    fn to_adafruit_stepper_motor(&self) -> Motor {
        match self {
            Self::Stepper1 => Motor::Stepper1,
            Self::Stepper2 => Motor::Stepper2,
        }
    }
}
 
pub struct VendCoil {
    tx_mutex: Mutex<Sender<()>>, // Mutex is needed for VendCoil to implement Sync.
    join_handle: JoinHandle<()>,
}
 
impl VendCoil {
    pub fn new(
        motor: StepperMotor,
        time_between_rotations: Duration,
    ) -> Result<Self, Box<dyn Error>> {
        let (tx, rx): (Sender<()>, Receiver<()>) = channel();
        let mut raw_coil = RawVendCoil::new(motor)?;
        Ok(Self {
            tx_mutex: Mutex::from(tx),
            join_handle: spawn(move || loop {
                loop {
                    // Blocks until a message is received.
                    match rx.try_recv() {
                        Ok(_) => {
                            raw_coil.rotate().unwrap();
                            sleep(time_between_rotations);
                        }
                        Err(TryRecvError::Empty) => {
                            // Skip iteration.
                        }
                        Err(TryRecvError::Disconnected) => {
                            break; // Exit loop if all tx's are dropped.
                        }
                    };
                }
            }),
        })
    }
 
    pub fn rotate(&self) {
        self.tx_mutex.lock().unwrap().send(()).unwrap();
    }
}
 
struct RawVendCoil {
    pwm: Pca9685<linux_embedded_hal::I2cdev>,
    stepper: adafruit_motorkit::stepper::StepperMotor,
}
 
impl RawVendCoil {
    fn new(motor: StepperMotor) -> Result<Self, Box<dyn Error>> {
        let mut pwm = init_pwm(None)?;
        let stepper = adafruit_motorkit::stepper::StepperMotor::try_new(
            &mut pwm,
            motor.to_adafruit_stepper_motor(),
            None,
        )?;
        Ok(Self { pwm, stepper })
    }
 
    fn rotate(&mut self) -> Result<(), Box<dyn Error>> {
        for _ in 0..400 {
            self.stepper
                .step_once(&mut self.pwm, StepDirection::Forward, StepStyle::Interleave)?;
        }
        Ok(())
    }
 
    fn stop(&mut self) -> Result<(), Box<dyn Error>> {
        self.stepper.stop(&mut self.pwm)?;
        Ok(())
    }
}
 
impl std::ops::Drop for RawVendCoil {
    fn drop(&mut self) {
        self.stop().unwrap();
    }
}