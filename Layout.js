import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  Home,
  ShoppingCart,
  Package,
  User,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  X,
  Heart,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();
    loadCartCount();
    window.addEventListener("storage", loadCartCount);
    return () => window.removeEventListener("storage", loadCartCount);
  }, []);

 