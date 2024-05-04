import * as React from "react";
import "./sidebar.css";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ParamWrapper from "./ParamWrapper";
import PresetComponent from "./PresetComponent";

export default function Sidebar() {
  const [open, setOpen] = React.useState(false);

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const DrawerList = (
    <Box role="presentation">
      <PresetComponent />
      <Divider />
      <ParamWrapper />
    </Box>
  );

  return (
    <div>
      <Button onClick={toggleDrawer(true)}>Settings</Button>
      <Drawer open={open} onClose={toggleDrawer(false)} className="sidebar">
        {DrawerList}
      </Drawer>
    </div>
  );
}
