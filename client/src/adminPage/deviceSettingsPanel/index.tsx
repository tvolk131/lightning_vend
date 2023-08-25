import * as React from 'react';
import {useEffect, useState} from 'react';
import {AdminDeviceView} from '../../../../shared/adminSocketTypes';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import {DeviceName} from '../../../../shared/proto';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import {InventoryItem} from '../../../../proto_out/lightning_vend/model';
import {InventoryItemDialog} from './inventoryItemDialog';
import OutlinedInput from '@mui/material/OutlinedInput';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {adminApi} from '../../api/adminApi';

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
              <Typography variant='h5'>{inventoryItem.displayName}</Typography>
              <Typography>Price: {inventoryItem.priceSats} sats</Typography>
              {inventoryItem.vendNullExecutionCommand && (
                <Typography>
                  Vend Execution Command: {
                    inventoryItem.vendNullExecutionCommand
                  }
                </Typography>
              )}
              {inventoryItem.inventoryCheckBoolExecutionCommand && (
                <Typography>
                  Inventory Check Command: {
                    inventoryItem.inventoryCheckBoolExecutionCommand
                  }
                </Typography>
              )}
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
        <InventoryItemDialog
          open={showAddInventoryItemDialog}
          onClose={() => setShowAddInventoryItemDialog(false)}
          inventoryItem={newInventoryItem}
          setInventoryItem={setNewInventoryItem}
          titleText={'Add Inventory Item'}
          contentText={
            'Item will be immediately accessible on the device\'s UI.'
          }
          submitText={'Add Item'}
          onSubmit={
            () => {
              const deviceName =
                DeviceName.parse(props.adminDeviceView.device.name);
              // TODO - Indicate to the user if `deviceName` is undefined.
              if (deviceName) {
                return adminApi
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
            }
          }
          device={props.adminDeviceView.device}
        />
      </div>
    </Paper>
  );
};