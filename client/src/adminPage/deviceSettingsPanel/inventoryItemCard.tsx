import * as React from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import {InventoryItem} from '../../../../proto_out/lightning_vend/model';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface InventoryItemCardProps {
  inventoryItem: InventoryItem,
  onDelete: () => void
}

export const InventoryItemCard = (props: InventoryItemCardProps) => {
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
      <IconButton style={{float: 'right'}} onClick={props.onDelete}>
        <DeleteIcon/>
      </IconButton>
    </Paper>
  );
};
