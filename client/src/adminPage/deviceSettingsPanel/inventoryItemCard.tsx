import * as React from 'react';
import {
  Device,
  InventoryItem
} from '../../../../proto_out/lightning_vend/model';
import {useEffect, useState} from 'react';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import {InventoryItemDialog} from './inventoryItemDialog';
import LoadingButton from '@mui/lab/LoadingButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface InventoryItemCardProps {
  inventoryItem: InventoryItem,
  onUpdate: (inventoryItem: InventoryItem) => Promise<void>,
  onDelete: () => Promise<void>,
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

  const [
    showDeleteInventoryItemDialog,
    setShowDeleteInventoryItemDialog
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting
  ] = useState(false);

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
            setShowDeleteInventoryItemDialog(true);
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
      <Dialog
        open={showDeleteInventoryItemDialog}
        onClose={() => setShowDeleteInventoryItemDialog(false)}
      >
        <DialogTitle>
          Delete Inventory Item
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this inventory item?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteInventoryItemDialog(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isDeleting} onClick={() => {
            setIsDeleting(true);
            props.onDelete().then(() => {
              setIsDeleting(false);
              setShowDeleteInventoryItemDialog(false);
            });
          }}>
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
