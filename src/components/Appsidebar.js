import React from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { Link } from "react-router-dom";

export default function AppSidebar() {
  return (
    <Sidebar>
      <Menu>
        <MenuItem component={<Link to="/" />}>Dashboard</MenuItem>
        <MenuItem component={<Link to="/documentation" />}>Documentation</MenuItem>
        <MenuItem component={<Link to="/calendar" />}>Calendar</MenuItem>
        <MenuItem component={<Link to="/e-commerce" />}>E-commerce</MenuItem>
      </Menu>
    </Sidebar>
  );
}
