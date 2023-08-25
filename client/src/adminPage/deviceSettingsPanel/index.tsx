import * as React from 'react';
import {useEffect, useState} from 'react';
import {AdminDeviceView} from '../../../../shared/adminSocketTypes';
import Button from '@mui/material/Button';
import {DeviceName} from '../../../../shared/proto';
import {EditableDeviceDisplayName} from './editableDeviceDisplayName';
import {InventoryItem} from '../../../../proto_out/lightning_vend/model';
import {InventoryItemCard} from './inventoryItemCard';
import {InventoryItemDialog} from './inventoryItemDialog';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {adminApi} from '../../api/adminApi';

interface DeviceSettingsPanelProps {
  adminDeviceView: AdminDeviceView
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
      <EditableDeviceDisplayName device={props.adminDeviceView.device}/>
      <div>
        <Typography variant={'h4'}>Inventory</Typography>
        {props.adminDeviceView.device.inventory.map((inventoryItem) => (
          <InventoryItemCard
            inventoryItem={inventoryItem}
            onDelete={
              () => {
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
              }
            }
          />
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