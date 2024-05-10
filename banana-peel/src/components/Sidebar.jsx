import * as React from "react";
import "./css/sidebar.css";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ParamWrapper from "./ParamWrapper";
import PresetComponent from "./PresetComponent";

export default function Sidebar() {
  const [open, setOpen] = React.useState(false);
  const [activeDrawer, setActiveDrawer] = React.useState('Presets');

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const handleListItemClick = (event, index) => {
    setActiveDrawer(index);
  };

  const paramKeys = {
    'API Servers': ['banana_api_url', 'kobold_api_url'],
    'Kobold Settings': [
      "max_context_length", "max_length", "rep_pen", "rep_pen_range", "sampler_order",
      "sampler_seed", "temperature", "tfs", "top_a", "top_k", "top_p",
      "min_p", "typical", "use_default_badwordsids", "mirostat", "mirostat_tau",
      "mirostat_eta", "grammar", "grammar_retain_state", "memory"
    ],
    'Prompt Settings': ['permanent_prompt', 'user', 'character', 'stop_sequence'],
  };

  const DrawerList = (
    <Box role="presentation">
      <List>
        {['Presets', 'API Servers', 'Kobold Settings', 'Prompt Settings'].map((text, index) => (
          <ListItem button key={text} selected={activeDrawer === text} onClick={(event) => handleListItemClick(event, text)}>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      {activeDrawer === 'Presets' && <PresetComponent />}
      {activeDrawer !== 'Presets' && <ParamWrapper includeKeys={paramKeys[activeDrawer]} />}
    </Box>
  );

  return (
    <div className="sidebar">
      <Button onClick={toggleDrawer(true)}>Settings</Button>
      <Drawer open={open} onClose={toggleDrawer(false)} className="drawer">
        {DrawerList}
      </Drawer>
    </div>
  );
}
