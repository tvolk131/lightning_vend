use std::collections::HashMap;
#[cfg(feature = "adafruit_motorkit")]
pub mod adafruit_motorkit;
#[cfg(feature = "liveace")]
pub mod liveace;

pub trait CommandExecutor: Send + Sync {
    /// Returns all available commands for this executor in no particular order.
    /// Available commands are immutable and will not change after the creation
    /// of the `CommandExecutor` instance, so calling this repeatedly will always
    /// yield the same results - although not necessarily in the same order.
    fn get_commands(&self) -> Box<dyn Iterator<Item = &str> + '_>;

    /// Executes a given command. Guaranteed to return an error if `command` is
    /// not a value returned by `get_commands`. Command is not guaranteed to have
    /// fully executed unless an `Ok` result is returned. However, the action
    /// may have still been executed if an `Err` result is returned.
    fn execute_command(&mut self, command: &str) -> Result<(), Box<dyn std::error::Error>>;
}

pub trait NamespacedCommandExecutor: CommandExecutor {
    /// Returns the namespace for this executor, which is used as a prefix for
    /// any commands that need to be passed to this executor. Must be an
    /// immutable value for the lifetime of the `CommandExecutor`.
    fn get_executor_namespace(&self) -> &str;
}

pub struct CommandExecutorManager {
    command_executors_by_namespace: HashMap<String, Box<dyn NamespacedCommandExecutor>>,
    commands_to_namespace_and_subcommand: HashMap<String, (String, String)>,
}

impl CommandExecutorManager {
    pub fn new(command_executors: Vec<Box<dyn NamespacedCommandExecutor>>) -> Result<Self, String> {
        let mut command_executors_by_namespace: HashMap<
            String,
            Box<dyn NamespacedCommandExecutor>,
        > = HashMap::new();
        let mut commands_to_namespace_and_subcommand: HashMap<String, (String, String)> =
            HashMap::new();

        for ce in command_executors {
            let namespace = ce.get_executor_namespace();
            if command_executors_by_namespace.contains_key(namespace) {
                return Err(format!("Duplicate executor namespace '{namespace}'"));
            }
            command_executors_by_namespace.insert(namespace.to_string(), ce);
        }

        for ce in command_executors_by_namespace.values() {
            let namespace = ce.get_executor_namespace();
            for subcommand in ce.get_commands() {
                let command = format!("{namespace}:{subcommand}");
                if commands_to_namespace_and_subcommand.contains_key(&command) {
                    return Err(format!("Duplicate command '{command}'"));
                }
                commands_to_namespace_and_subcommand
                    .insert(command, (namespace.to_string(), subcommand.to_string()));
            }
        }

        Ok(Self {
            command_executors_by_namespace,
            commands_to_namespace_and_subcommand,
        })
    }
}

impl CommandExecutor for CommandExecutorManager {
    fn get_commands(&self) -> Box<dyn Iterator<Item = &str> + '_> {
        Box::from(
            self.commands_to_namespace_and_subcommand
                .keys()
                .map(|s| s.as_str()),
        )
    }

    fn execute_command(&mut self, command: &str) -> Result<(), Box<dyn std::error::Error>> {
        let (namespace, subcommand) = match self.commands_to_namespace_and_subcommand.get(command) {
            Some((namespace, subcommand)) => (namespace, subcommand),
            None => return Err(Box::from(String::from("Unknown command"))),
        };

        match self.command_executors_by_namespace.get_mut(namespace) {
            Some(ce) => ce.execute_command(subcommand),
            None => Err(Box::from(String::from("Unknown command"))),
        }
    }
}
