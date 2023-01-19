import * as React from 'react';
import {useState, useEffect} from 'react';
import {Paper, Typography, InputAdornment, IconButton, OutlinedInput, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField} from '@mui/material';
import {CheckCircle as CheckCircleIcon, Edit as EditIcon, Delete as DeleteIcon} from '@mui/icons-material';
import {AdminDeviceView} from '../../../server/adminSessionManager';
import {adminApi} from '../api/adminApi';
import {InventoryItem} from '../../../proto/lightning_vend/model';

interface DeviceSettingsPanelProps {
  adminDeviceView: AdminDeviceView
}

const emptyInventoryItem = InventoryItem.create({priceSats: 1});

export const DeviceSettingsPanel = (props: DeviceSettingsPanelProps) => {
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  const [showAddInventoryItemDialog, setShowAddInventoryItemDialog] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState<InventoryItem>(emptyInventoryItem);

  const updateDisplayName = () => {
    if (props.adminDeviceView) {
      adminApi.updateDeviceDisplayName(props.adminDeviceView.deviceData.deviceSessionId, newDisplayName).then(() => setIsEditingDisplayName(false));
    }
  };

  useEffect(() => {
    setNewDisplayName(props.adminDeviceView.deviceData.displayName || '');
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
                <IconButton size={'large'} color={'primary'} onClick={() => updateDisplayName()}>
                  <CheckCircleIcon/>
                </IconButton>
              </InputAdornment>
            }
          />
        ) : (
          <div style={{display: 'flex'}}>
            <Typography variant={'h2'} style={{padding: '23.5px 14px 23.75px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{props.adminDeviceView.deviceData.displayName}</Typography>
            <IconButton size={'large'} style={{marginTop: '35px', marginRight: '14px', height: '100%'}} onClick={() => setIsEditingDisplayName(!isEditingDisplayName)}>
              <EditIcon/>
            </IconButton>
          </div>
        )
      }
      <div>
        <Typography variant={'h4'}>Inventory</Typography>
        {props.adminDeviceView.deviceData.inventory.map((inventoryItem) => (
          <Paper
            elevation={6}
            style={{padding: '10px', margin: '10px 0'}}
          >
            <div style={{display: 'inline-block'}}>
              <Typography>Item Name: {inventoryItem.displayName}</Typography>
              <Typography>Price: {inventoryItem.priceSats} sats</Typography>
              <Typography>Webhook: {inventoryItem.executionWebhook}</Typography>
            </div>
            <IconButton style={{float: 'right'}} onClick={() => {
              adminApi.updateDeviceInventory(props.adminDeviceView.deviceData.deviceSessionId, props.adminDeviceView.deviceData.inventory.filter((i) => i !== inventoryItem));
            }}>
              <DeleteIcon/>
            </IconButton>
          </Paper>
        ))}
        <Button onClick={() => setShowAddInventoryItemDialog(true)}>Add Item</Button>
        <Dialog open={showAddInventoryItemDialog} onClose={() => setShowAddInventoryItemDialog(false)}>
          <DialogTitle>
            Add Inventory Item
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Item will be immediately accessible on the device's UI. Keep in mind that
              the execution webhook can use `localhost` to access the device itself.
            </DialogContentText>
            <TextField
              style={{display: 'flex', marginTop: '15px'}}
              label={'Name'}
              value={newInventoryItem.displayName}
              onChange={(e) => setNewInventoryItem({...newInventoryItem, displayName: e.target.value})}
            />
            <TextField
              style={{display: 'flex', marginTop: '15px'}}
              label={'Price (Sats)'}
              type={'number'}
              value={`${newInventoryItem.priceSats}`}
              onChange={(e) => setNewInventoryItem({...newInventoryItem, priceSats: Math.max(Math.floor(Number(e.target.value)), 1)})}
            />
            <TextField
              style={{display: 'flex', marginTop: '15px'}}
              label={'Execution Webhook'}
              value={newInventoryItem.executionWebhook}
              onChange={(e) => setNewInventoryItem({...newInventoryItem, executionWebhook: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddInventoryItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // TODO - Show a loading spinner until this promise resolves below.
              adminApi.updateDeviceInventory(props.adminDeviceView.deviceData.deviceSessionId, [...props.adminDeviceView.deviceData.inventory, newInventoryItem])
                .then(() => {
                  setNewInventoryItem(emptyInventoryItem);
                  setShowAddInventoryItemDialog(false);
                });
            }}>
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </Paper>
  );
};