use adafruit_motorkit::{
    init_pwm,
    stepper::{StepDirection, StepStyle},
    Motor, MotorError,
};
use pwm_pca9685::Pca9685;
use std::error::Error;
use std::sync::mpsc::{channel, Receiver, Sender, TryRecvError};
use std::sync::{Arc, Mutex};
use std::thread::{sleep, spawn, JoinHandle};
use std::time::Duration;

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
    tx_mutex: Mutex<Sender<VendCoilChannelMessage>>, // Mutex is needed for VendCoil to implement Sync.
    raw_coil: Arc<Mutex<RawVendCoil>>,
    join_handle_or: Mutex<Option<JoinHandle<()>>>,
}

impl VendCoil {
    pub fn new(
        motor: StepperMotor,
        time_between_rotations: Duration,
    ) -> Result<Self, Box<dyn Error>> {
        let (tx, rx): (
            Sender<VendCoilChannelMessage>,
            Receiver<VendCoilChannelMessage>,
        ) = channel();
        let raw_coil = Arc::from(Mutex::from(RawVendCoil::new(motor)?));
        let raw_coil_thread_ref = raw_coil.clone();
        Ok(Self {
            tx_mutex: Mutex::from(tx),
            raw_coil,
            join_handle_or: Mutex::from(Some(spawn(move || loop {
                loop {
                    // Blocks until a message is received.
                    match rx.try_recv() {
                        Ok(message) => match message {
                            VendCoilChannelMessage::Rotate => {
                                // TODO - Somehow propogate error from `rotate` back to caller.
                                raw_coil_thread_ref.lock().unwrap().rotate().unwrap();
                                sleep(time_between_rotations);
                            }
                            VendCoilChannelMessage::ExitLoop => {
                                break;
                            }
                        },
                        Err(TryRecvError::Empty) => {
                            // Skip iteration.
                        }
                        Err(TryRecvError::Disconnected) => {
                            break; // Exit loop if all tx's are dropped.
                        }
                    };
                }
            }))),
        })
    }

    /// Queues a motor rotation. Only blocks if there are multiple simultaneous
    /// calls to this method on different threads.
    pub fn rotate(&self) {
        self.tx_mutex
            .lock()
            .unwrap()
            .send(VendCoilChannelMessage::Rotate)
            .unwrap();
    }

    /// Blocks until all queued motor actions have finished, then stops
    /// energizing the PWMs for this motor.
    pub fn stop(&self) -> Result<(), MotorError> {
        self.tx_mutex
            .lock()
            .unwrap()
            .send(VendCoilChannelMessage::ExitLoop)
            .unwrap();
        // Now that we've sent a stop message to the thread that this handle is
        // referencing, we will wait for all queued actions to complete.
        self.join_handle_or
            .lock()
            .unwrap()
            .take()
            .map(JoinHandle::join)
            .unwrap()
            .unwrap();
        self.raw_coil.lock().unwrap().stop()
    }
}

enum VendCoilChannelMessage {
    Rotate,
    ExitLoop,
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

    fn rotate(&mut self) -> Result<(), MotorError> {
        for _ in 0..400 {
            self.stepper
                .step_once(&mut self.pwm, StepDirection::Forward, StepStyle::Interleave)?;
        }
        Ok(())
    }

    fn stop(&mut self) -> Result<(), MotorError> {
        self.stepper.stop(&mut self.pwm)
    }
}
