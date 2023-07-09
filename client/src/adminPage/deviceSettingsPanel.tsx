import * as React from 'react';
import {useEffect, useState} from 'react';
import {AdminDeviceView} from '../../../server/persistence/adminSessionManager';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import {DeviceName} from '../../../shared/proto';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import {InventoryItem} from '../../../proto/lightning_vend/model';
import OutlinedInput from '@mui/material/OutlinedInput';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {adminApi} from '../api/adminApi';

interface DeviceSettingsPanelProps {
  adminDeviceView: AdminDeviceView
}

const emptyInventoryItem = InventoryItem.create({priceSats: 1});

export const DeviceSettingsPanel = (props: DeviceSettingsPanelProps) => {
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  const [
    showAddInventoryItemDialog,
    setShowAddInventoryItemDialog
  ] = useState(false);
  const [
    newInventoryItem,
    setNewInventoryItem
  ] = useState<InventoryItem>(emptyInventoryItem);

  const updateDisplayName = () => {
    if (props.adminDeviceView) {
      const deviceName = DeviceName.parse(props.adminDeviceView.device.name);
      // TODO - Indicate to the user if `deviceName` is undefined.
      if (deviceName) {
        adminApi
          .updateDeviceDisplayName(deviceName, newDisplayName)
          .then(() => setIsEditingDisplayName(false));
      }
    }
  };

  useEffect(() => {
    setNewDisplayName(props.adminDeviceView.device.displayName || '');
  }, [isEditingDisplayName]);

  useEffect(() => {
    setNewInventoryItem(emptyInventoryItem);
  }, [showAddInventoryItemDialog]);

  return (
    <Paper style={{padding: '10px'}}>
      {isEditingDisplayName ? (
          <OutlinedInput
            // These styles are to match the Typography h2 below.
            style={{
              fontWeight: 300,
              fontSize: '3.75em',
              lineHeight: 1.2,
              letterSpacing: '-0.00833em',
              width: '100%'
            }}
            autoFocus
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateDisplayName();
              }
            }}
            endAdornment={
              <InputAdornment position={'end'}>
                <IconButton
                  size={'large'}
                  color={'primary'}
                  onClick={() => updateDisplayName()}
                >
                  <CheckCircleIcon/>
                </IconButton>
              </InputAdornment>
            }
          />
        ) : (
          <div style={{display: 'flex'}}>
            <Typography
              variant={'h2'}
              style={{
                padding: '23.5px 14px 23.75px',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {props.adminDeviceView.device.displayName}
            </Typography>
            <IconButton
              size={'large'}
              style={{marginTop: '35px', marginRight: '14px', height: '100%'}}
              onClick={() => setIsEditingDisplayName(!isEditingDisplayName)}
            >
              <EditIcon/>
            </IconButton>
          </div>
        )
      }
      <div>
        <Typography variant={'h4'}>Inventory</Typography>
        {props.adminDeviceView.device.inventory.map((inventoryItem) => (
          <Paper
            elevation={6}
            style={{padding: '10px', margin: '10px 0'}}
          >
            <div style={{display: 'inline-block'}}>
              <Typography>Item Name: {inventoryItem.displayName}</Typography>
              <Typography>Price: {inventoryItem.priceSats} sats</Typography>
              <Typography>
                Vend Execution Command: {inventoryItem.vendNullExecutionCommand}
              </Typography>
              <Typography>
                Inventory Check Command: {
                  inventoryItem.inventoryCheckBoolExecutionCommand
                }
              </Typography>
            </div>
            <IconButton style={{float: 'right'}} onClick={() => {
              const deviceName =
                DeviceName.parse(props.adminDeviceView.device.name);
              // TODO - Indicate to the user if `deviceName` is undefined.
              if (deviceName) {
                adminApi.updateDeviceInventory(
                  deviceName,
                  props.adminDeviceView.device.inventory.filter(
                    (i) => i !== inventoryItem
                  )
                );
              }
            }}>
              <DeleteIcon/>
            </IconButton>
          </Paper>
        ))}
        <Button onClick={() => setShowAddInventoryItemDialog(true)}>
          Add Item
        </Button>
        <Dialog
          open={showAddInventoryItemDialog}
          onClose={() => setShowAddInventoryItemDialog(false)}
        >
          <DialogTitle>
            Add Inventory Item
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Item will be immediately accessible on the device's UI.
            </DialogContentText>
            <TextField
              style={{display: 'flex', marginTop: '15px'}}
              label={'Name'}
              value={newInventoryItem.displayName}
              onChange={
                (e) => setNewInventoryItem({
                  ...newInventoryItem,
                  displayName: e.target.value
                })
              }
            />
            <TextField
              style={{display: 'flex', marginTop: '15px'}}
              label={'Price (Sats)'}
              type={'number'}
              value={`${newInventoryItem.priceSats}`}
              onChange={
                (e) => setNewInventoryItem({
                  ...newInventoryItem,
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
              options={props.adminDeviceView.device.nullExecutionCommands}
              onChange={
                (e, selectedCommand) => setNewInventoryItem({
                  ...newInventoryItem,
                  vendNullExecutionCommand: selectedCommand || ''
                })
              }
              value={newInventoryItem.vendNullExecutionCommand}
            />
            <Autocomplete
              renderInput={(params) => (
                <TextField
                  {...params}
                  style={{display: 'flex', marginTop: '15px'}}
                  label={'Inventory Check Command'}
                />
              )}
              options={props.adminDeviceView.device.boolExecutionCommands}
              onChange={
                (e, selectedCommand) => setNewInventoryItem({
                  ...newInventoryItem,
                  inventoryCheckBoolExecutionCommand: selectedCommand || ''
                })
              }
              value={newInventoryItem.inventoryCheckBoolExecutionCommand}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddInventoryItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // TODO - Show a loading spinner until this promise resolves
              // below.

              const deviceName =
                DeviceName.parse(props.adminDeviceView.device.name);
              // TODO - Indicate to the user if `deviceName` is undefined.
              if (deviceName) {
                adminApi
                  .updateDeviceInventory(
                    deviceName,
                    [
                      ...props.adminDeviceView.device.inventory,
                      newInventoryItem
                    ]
                  )
                  .then(() => {
                    setNewInventoryItem(emptyInventoryItem);
                    setShowAddInventoryItemDialog(false);
                  });
              }
            }}>
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </Paper>
  );
};