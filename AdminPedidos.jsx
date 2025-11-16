import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Clock, Truck, CheckCircle2, XCircle, MapPin, Eye, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function AdminPedidos() {
  const [user, setUser] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== "admin") {
        window.location.href = createPageUrl("Home");
      }
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['admin-pedidos'],
    queryFn: () => base44.entities.Pedido.list("-created_date"),
    enabled: !!user,
    initialData: [],
  });

  const atualizarStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Pedido.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pedidos'] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    }
  });

  const statusConfig = {
    pendente: {
      icon: Clock,
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      label: "Pendente",
      nextStatus: "confirmado"
    },
    confirmado: {
      icon: CheckCircle2,
      color: "bg-blue-100 text-blue-800 border-blue-200",
      label: "Confirmado",
      nextStatus: "preparando"
    },
    preparando: {
      icon: Package,
      color: "bg-purple-100 text-purple-800 border-purple-200",
      label: "Preparando",
      nextStatus: "em_entrega"
    },
    em_entrega: {
      icon: Truck,
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
      label: "Em Entrega",
      nextStatus: "entregue"
    },
    entregue: {
      icon: CheckCircle2,
      color: "bg-green-100 text-green-800 border-green-200",
      label: "Entregue",
      nextStatus: null
    },
    cancelado: {
      icon: XCircle,
      color: "bg-red-100 text-red-800 border-red-200",
      label: "Cancelado",
      nextStatus: null
    }
  };

  const pedidosFiltrados = statusFilter === "todos" 
    ? pedidos 
    : pedidos.filter(p => p.status === statusFilter);

  const avancarStatus = (pedido) => {
    const config = statusConfig[pedido.status];
    if (config.nextStatus) {
      atualizarStatusMutation.mutate({ id: pedido.id, status: config.nextStatus });
    }
  };

  const cancelarPedido = (pedido) => {
    if (confirm("Deseja realmente cancelar este pedido?")) {
      atualizarStatusMutation.mutate({ id: pedido.id, status: "cancelado" });
    }
  };

  const statsCards = [
    {
      label: "Pendentes",
      value: pedidos.filter(p => p.status === "pendente").length,
      color: "bg-yellow-100 text-yellow-800"
    },
    {
      label: "Em Preparo",
      value: pedidos.filter(p => p.status === "preparando" || p.status === "confirmado").length,
      color: "bg-blue-100 text-blue-800"
    },
    {
      label: "Em Entrega",
      value: pedidos.filter(p => p.status === "em_entrega").length,
      color: "bg-indigo-100 text-indigo-800"
    },
    {
      label: "Entregues Hoje",
      value: pedidos.filter(p => 
        p.status === "entregue" && 
        new Date(p.updated_date).toDateString() === new Date().toDateString()
      ).length,
      color: "bg-green-100 text-green-800"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Pedidos</h1>
          <p className="text-gray-600">
            Acompanhe e atualize o status dos pedidos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color.split(' ')[1]}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="preparando">Preparando</SelectItem>
                  <SelectItem value="em_entrega">Em Entrega</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">
                {pedidosFiltrados.length} pedido(s)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Pedidos */}
        <Card>
 