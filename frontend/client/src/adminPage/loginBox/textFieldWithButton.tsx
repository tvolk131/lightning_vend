import * as React from 'react';
import LoadingButton from '@mui/lab/LoadingButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {styled} from '@mui/material/styles';

interface TextFieldWithButtonProps {
  rootStyle?: React.CSSProperties,
  textFieldValue: string,
  textFieldDisabled?: boolean,
  textFieldEndAdornment?: React.ReactNode,
  textFieldLabel: string,
  onTextFieldChange?: (event: React.ChangeEvent<HTMLInputElement>) => void,
  buttonValue: string,
  buttonIsLoading?: boolean,
  buttonIsDisabled?: boolean,
  onButtonClick: () => void,
  showPaperInsteadOfButton?: boolean
}

export const TextFieldWithButton = (props: TextFieldWithButtonProps) => {
  return (
    <div style={props.rootStyle}>
      <TextFieldWithSharpBottomCorners
        disabled={!!props.textFieldDisabled}
        label={props.textFieldLabel}
        style={{width: '100%'}}
        value={props.textFieldValue}
        onChange={props.onTextFieldChange}
        InputProps={
          {endAdornment: props.textFieldEndAdornment}
        }
      />
      {
        props.showPaperInsteadOfButton ?
          (
            <Paper
              elevation={6}
              style={{
                // Set to the exact value so that the height matches the
                // height of the <LoadingButton/> below it.
                padding: '6.25px',
                borderTopLeftRadius: '0px',
                borderTopRightRadius: '0px'
              }}
            >
              <Typography>
                {props.buttonValue}
              </Typography>
            </Paper>
          )
          :
          (
            <LoadingButton
              variant={'contained'}
              onClick={props.onButtonClick}
              loading={!!props.buttonIsLoading}
              disabled={!!props.buttonIsDisabled}
              style={{
                width: '100%',
                display: 'flex',
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0
              }}
            >
              {props.buttonValue}
            </LoadingButton>
          )
      }
    </div>
  );
};

const TextFieldWithSharpBottomCorners = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0
    }
  }
});
