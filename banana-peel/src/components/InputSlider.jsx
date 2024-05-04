import { useContext } from 'react';
import { FormContext } from '../contexts/FormContext';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Slider from '@mui/material/Slider';
import MuiInput from '@mui/material/Input';
import formConfig from '../formConfig';
import './inputSlider.css';

const Input = styled(MuiInput)`
  width: 42px;
`;

export default function InputSlider({ name }) {
  const { form, setForm } = useContext(FormContext);
  const entryConfig = formConfig[name];
  const value = form[name];

  const handleSliderChange = (event, newValue) => {
    setForm({ ...form, [name]: newValue });
  };

  const handleInputChange = (event) => {
    let newValue = event.target.value === '' ? 0 : Number(event.target.value);
    if (entryConfig.type === 'integer') {
      newValue = Math.round(newValue);
    }
    setForm({ ...form, [name]: newValue });
  };

  const handleBlur = () => {
    let newValue = value;
    if (newValue < entryConfig.min) {
      newValue = entryConfig.min;
    } else if (newValue > entryConfig.max) {
      newValue = entryConfig.max;
    }
    setForm({ ...form, [name]: newValue });
  };

  return (
    <Box>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs>
          <Slider
            value={value}
            onChange={handleSliderChange}
            aria-labelledby="input-slider"
            step={entryConfig.type === 'float' ? entryConfig.step : 1}
            min={entryConfig.min}
            max={entryConfig.max}
            scale={entryConfig.type === 'float' ? (x) => x : undefined}
          />
        </Grid>
        <Grid item>
          <Input
            className='numberInput'
            value={value}
            size="small"
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              step: entryConfig.step,
              min: entryConfig.min,
              max: entryConfig.max,
              type: 'number',
              'aria-labelledby': 'input-slider',
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}