import * as React from 'react';
import {
  Device,
  InventoryItem
} from '../../../../proto_out/lightning_vend/model';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LoadingButton from '@mui/lab/LoadingButton';
import TextField from '@mui/material/TextField';
import {useState} from 'react';

interface InventoryItemDialogProps {
  open: boolean,
  onClose: () => void,
  inventoryItem: InventoryItem,
  setInventoryItem: (inventoryItem: InventoryItem) => void,
  titleText: string,
  contentText: string,
  submitText: string,
  /**
   * Called when the dialog box is submitted by the user. The dialog closes
   * itself after this function is called. If this function returns a promise,
   * the dialog will wait for the promise to resolve before closing. Otherwise,
   * the dialog will close immediately.
   * @returns Nothing if the dialog submission is synchronous, or an empty
   * promise if the dialog submission is asynchronous.
   */
  onSubmit: () => void | Promise<void>,
  device: Device
}

export const InventoryItemDialog = (props: InventoryItemDialogProps) => {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
    >
      <DialogTitle>
        {props.titleText}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {props.contentText}
        </DialogContentText>
        <TextField
          style={{display: 'flex', marginTop: '15px'}}
          label={'Name'}
          value={props.inventoryItem.displayName}
          onChange={
            (e) => props.setInventoryItem({
              ...props.inventoryItem,
              displayName: e.target.value
            })
          }
        />
        <TextField
          style={{display: 'flex', marginTop: '15px'}}
          label={'Price (Sats)'}
          type={'number'}
          value={`${props.inventoryItem.priceSats}`}
          onChange={
            (e) => props.setInventoryItem({
              ...props.inventoryItem,
              priceSats: Math.max(Math.floor(Number(e.target.value)), 1)
            })
          }
        />
        <Autocomplete
          renderInput={(params) => (
            <TextField
              {...params}
              style={{display: 'flex', marginTop: '15px'}}
              label={'Vend Execution Command'}
            />
          )}
          options={props.device.nullExecutionCommands}
          onChange={
            (e, selectedCommand) => props.setInventoryItem({
              ...props.inventoryItem,
              vendNullExecutionCommand: selectedCommand || ''
            })
          }
          value={props.inventoryItem.vendNullExecutionCommand}
        />
        <Autocomplete
          renderInput={(params) => (
            <TextField
              {...params}
              style={{display: 'flex', marginTop: '15px'}}
              label={'Inventory Check Command'}
            />
          )}
          options={props.device.boolExecutionCommands}
          onChange={
            (e, selectedCommand) => props.setInventoryItem({
              ...props.inventoryItem,
              inventoryCheckBoolExecutionCommand: selectedCommand || ''
            })
          }
          value={props.inventoryItem.inventoryCheckBoolExecutionCommand}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>
          Cancel
        </Button>
        <LoadingButton loading={submitting} onClick={() => {
          const submitResponse = props.onSubmit();

          // If `submitResponse` is a asynchronous, wait for it to resolve
          // before closing the dialog. Otherwise, just close the dialog.
          if (submitResponse instanceof Promise) {
            setSubmitting(true);
            submitResponse.then(() => {
              setSubmitting(false);
              props.onClose();
            });
          } else {
            props.onClose();
          }
        }}>
          {props.submitText}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
