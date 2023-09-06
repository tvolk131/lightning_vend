import * as React from 'react';
import {useEffect, useState} from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {Device} from '../../../../proto_out/lightning_vend/model';
import {DeviceName} from '../../../../shared/proto';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import {adminApi} from '../../api/adminApi';

interface EditableDeviceDisplayNameProps {
  device: Device
}

export const EditableDeviceDisplayName = (
  props: EditableDeviceDisplayNameProps
) => {
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  useEffect(() => {
    setNewDisplayName(props.device.displayName || '');
  }, [isEditingDisplayName]);

  const updateDisplayName = () => {
    const deviceName = DeviceName.parse(props.device.name);
    // TODO - Indicate to the user if `deviceName` is undefined.
    if (deviceName) {
      adminApi
        .updateDeviceDisplayName(deviceName, newDisplayName)
        .then(() => setIsEditingDisplayName(false));
    }
  };

  return isEditingDisplayName ? (
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
        {props.device.displayName}
      </Typography>
      <IconButton
        size={'large'}
        style={{marginTop: '35px', marginRight: '14px', height: '100%'}}
        onClick={() => setIsEditingDisplayName(!isEditingDisplayName)}
      >
        <EditIcon/>
      </IconButton>
    </div>
  );
};
