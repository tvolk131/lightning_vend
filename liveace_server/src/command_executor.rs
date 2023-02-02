pub trait CommandExecutor<E> {
    /// Returns all available commands for this executor in no particular order.
    /// Available commands are immutable and will not change after the creation
    /// of the `CommandExecutor` instance, so calling this repeatedly will always
    /// yield the same results - although not necessarily in the same order.
    fn get_commands(&self) -> Box<dyn Iterator<Item = &String> + '_>;

    /// Executes a given command. Guaranteed to return an error if `command` is
    /// not a value returned by `get_commands`. Command is not guaranteed to have
    /// fully executed unless an `Ok` result is returned. However, the action
    /// may have still been executed if an `Err` result is returned.
    fn execute_command(&mut self, command: &str) -> Result<Option<serde_json::Value>, E>;

    /// Returns the namespace for this executor, which is used as a prefix for
    /// any commands that need to be passed to this executor. Must be an
    /// immutable value for the lifetime of the `CommandExecutor`.
    fn get_executor_namespace(&self) -> &str;
}
