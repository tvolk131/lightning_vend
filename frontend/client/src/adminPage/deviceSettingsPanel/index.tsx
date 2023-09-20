import * as React from 'react';
import {
  Device,
  Device_ColorScheme,
  InventoryItem
} from '../../../../proto_out/lightning_vend/model';
import {useEffect, useState} from 'react';
import Button from '@mui/material/Button';
import {DeviceName} from '../../../../shared/proto';
import {EditableDeviceDisplayName} from './editableDeviceDisplayName';
import {InventoryItemCard} from './inventoryItemCard';
import {InventoryItemDialog} from './inventoryItemDialog';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {adminApi} from '../../api/adminApi';
import {MenuItem} from '@mui/material';
import {Select} from '@mui/material';

interface DeviceSettingsPanelProps {
  device: Device
}

const emptyInventoryItem = InventoryItem.create({priceSats: 1});

export const DeviceSettingsPanel = (props: DeviceSettingsPanelProps) => {
  const [
    showAddInventoryItemDialog,
    setShowAddInventoryItemDialog
  ] = useState(false);

  const [
    newInventoryItem,
    setNewInventoryItem
  ] = useState<InventoryItem>(emptyInventoryItem);

  useEffect(() => {
    setNewInventoryItem(emptyInventoryItem);
  }, [showAddInventoryItemDialog]);

  return (
    <Paper style={{padding: '10px'}}>
      <EditableDeviceDisplayName device={props.device}/>
      <Select<Device_ColorScheme> value={props.device.colorScheme} onChange={(e) => adminApi.updateDeviceColorScheme(e.target.value)}>
        <MenuItem value={Device_ColorScheme.SYSTEM_DEFAULT}>Device Default</MenuItem>
        <MenuItem value={Device_ColorScheme.DEFAULT_DARK}>Dark</MenuItem>
        <MenuItem value={Device_ColorScheme.DEFAULT_LIGHT}>Light</MenuItem>
      </Select>
      <Typography variant={'h4'}>Inventory</Typography>
      <div>
        {props.device.inventory.map((inventoryItem, i) => (
          <InventoryItemCard
            inventoryItem={inventoryItem}
            onUpdate={
              (updatedInventoryItem) => {
                const deviceName =
                  DeviceName.parse(props.device.name);
                // TODO - Indicate to the user if `deviceName` is undefined.
                if (deviceName) {
                  const newInventory = [...props.device.inventory];
                  newInventory[i] = updatedInventoryItem;

                  return adminApi.updateDeviceInventory(
                    deviceName,
                    newInventory
                  );
                }

                return Promise.resolve();
              }
            }
            onDelete={
              () => {
                const deviceName =
                  DeviceName.parse(props.device.name);
                // TODO - Indicate to the user if `deviceName` is undefined.
                if (deviceName) {
                  return adminApi.updateDeviceInventory(
                    deviceName,
                    props.device.inventory.filter(
                      (i) => i !== inventoryItem
                    )
                  );
                }

                return Promise.resolve();
              }
            }
            device={props.device}
          />
        ))}
      </div>
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
              DeviceName.parse(props.device.name);
            // TODO - Indicate to the user if `deviceName` is undefined.
            if (deviceName) {
              return adminApi
                .updateDeviceInventory(
                  deviceName,
                  [
                    ...props.device.inventory,
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
        device={props.device}
      />
    </Paper>
  );
};