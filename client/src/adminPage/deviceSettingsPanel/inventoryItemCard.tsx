import * as React from 'react';
import {
  Device,
  InventoryItem
} from '../../../../proto_out/lightning_vend/model';
import {useEffect, useState} from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import {InventoryItemDialog} from './inventoryItemDialog';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface InventoryItemCardProps {
  inventoryItem: InventoryItem,
  onUpdate: (inventoryItem: InventoryItem) => Promise<void>,
  onDelete: () => void,
  device: Device
}

export const InventoryItemCard = (props: InventoryItemCardProps) => {
  const [
    showUpdateInventoryItemDialog,
    setShowUpdateInventoryItemDialog
  ] = useState(false);

  const [
    updatedInventoryItem,
    setUpdatedInventoryItem
  ] = useState(props.inventoryItem);

  useEffect(() => {
    setUpdatedInventoryItem(props.inventoryItem);
  }, [props.inventoryItem, showUpdateInventoryItemDialog]);

  const [
    menuAnchorEl,
    setMenuAnchorEl
  ] = React.useState<null | HTMLElement>(null);

  return (
    <Paper
      elevation={6}
      style={{padding: '10px', margin: '10px 0'}}
    >
      <div style={{display: 'inline-block'}}>
        <Typography variant='h5'>{props.inventoryItem.displayName}</Typography>
        <Typography>Price: {props.inventoryItem.priceSats} sats</Typography>
        {props.inventoryItem.vendNullExecutionCommand && (
          <Typography>
            Vend Execution Command: {
              props.inventoryItem.vendNullExecutionCommand
            }
          </Typography>
        )}
        {props.inventoryItem.inventoryCheckBoolExecutionCommand && (
          <Typography>
            Inventory Check Command: {
              props.inventoryItem.inventoryCheckBoolExecutionCommand
            }
          </Typography>
        )}
      </div>
      <div style={{float: 'right'}}>
        <IconButton onClick={(event) => setMenuAnchorEl(event.currentTarget)}>
          <MoreVertIcon/>
        </IconButton>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
        >
          <MenuItem onClick={() => {
            setMenuAnchorEl(null);
            setShowUpdateInventoryItemDialog(true);
          }}>
            <EditIcon style={{paddingRight: '10px'}}/>
            Edit
          </MenuItem>
          <MenuItem onClick={() => {
            setMenuAnchorEl(null);
            props.onDelete();
          }}>
            <DeleteIcon style={{paddingRight: '10px'}}/>
            Delete
          </MenuItem>
        </Menu>
      </div>
      <InventoryItemDialog
        open={showUpdateInventoryItemDialog}
        onClose={() => setShowUpdateInventoryItemDialog(false)}
        inventoryItem={updatedInventoryItem}
        setInventoryItem={setUpdatedInventoryItem}
        titleText={'Edit Inventory Item'}
        contentText={
          'Changes will be immediately reflected on the device\'s UI.'
        }
        submitText={'Save Changes'}
        onSubmit={
          () => {
            return props.onUpdate(updatedInventoryItem)
              .then(() => {
                setUpdatedInventoryItem(props.inventoryItem);
                setShowUpdateInventoryItemDialog(false);
              });
          }
        }
        device={props.device}
      />
    </Paper>
  );
};
