import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Package, ShoppingCart, DollarSign, TrendingUp, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);

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

  const { data: produtos = [] } = useQuery({
    queryKey: ['admin-produtos'],
    queryFn: () => base44.entities.Produto.list(),
    enabled: !!user,
    initialData: [],
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['admin-pedidos'],
    queryFn: () => base44.entities.Pedido.list("-created_date"),
    enabled: !!user,
    initialData: [],
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ['admin-avaliacoes'],
    queryFn: () => base44.entities.Avaliacao.list(),
    enabled: !!user,
    initialData: [],
  });

  const totalVendas = pedidos
    .filter(p => p.status !== "cancelado")
    .reduce((sum, p) => sum + (p.total || 0), 0);

  const pedidosPendentes = pedidos.filter(p => 
    p.status === "pendente" || p.status === "confirmado"
  ).length;

  const produtosEstoqueBaixo = produtos.filter(p => 
    p.estoque <= p.estoque_minimo && p.ativo
  ).length;

  const avaliacoesPendentes = avaliacoes.filter(a => 
    a.status === "pendente"
  ).length;

  const statCards = [
    {
      title: "Total de Vendas",
      value: `R$ ${totalVendas.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Pedidos Ativos",
      value: pedidosPendentes,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: createPageUrl("AdminPedidos")
    },
    {
      title: "Produtos Cadastrados",
      value: produtos.length,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: createPageUrl("AdminProdutos")
    },
    {
      title: "Estoque Baixo",
      value: produtosEstoqueBaixo,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      alert: produtosEstoqueBaixo > 0
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Administrativo
          </h1>
          <p className="text-gray-600">
            Bem-vindo, {user?.full_name}
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card 
              key={index} 
              className={`${stat.link ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${stat.alert ? 'border-red-200' : ''}`}
              onClick={() => stat.link && (window.location.href = stat.link)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <h3 className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </h3>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pedidos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {pedidos.slice(0, 5).length === 0 ? (
              <p className="text-gray-600 text-center py-8">Nenhum pedido ainda</p>
            ) : (
              <div className="space-y-3">
                {pedidos.slice(0, 5).map((pedido) => (
                  <div 
                    key={pedido.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        #{pedido.id.slice(-8)} - {pedido.cliente_nome}
                      </p>
                      <p className="text-sm text-gray-600">
                        {pedido.itens?.length || 0} itens • R$ {pedido.total.toFixed(2)}
                      </p>
                    </div>
                    <Badge className={
                      pedido.status === "entregue" ? "bg-green-100 text-green-800" :
                      pedido.status === "cancelado" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }>
                      {pedido.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Link to={createPageUrl("AdminPedidos")}>
              <button className="w-full mt-4 text-teal-600 hover:text-teal-700 font-medium text-sm">
                Ver todos os pedidos →
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* Produtos com Estoque Baixo */}
        {produtosEstoqueBaixo > 0 && (
          <Card className="mt-6 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                Atenção: Produtos com Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {produtos
                  .filter(p => p.estoque <= p.estoque_minimo && p.ativo)
                  .map((produto) => (
                    <div key={produto.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="font-medium text-gray-900">{produto.nome}</span>
                      <Badge variant="destructive">
                        Estoque: {produto.estoque}
                      </Badge>
                    </div>
                  ))}
              </div>
              <Link to={createPageUrl("AdminProdutos")}>
                <button className="w-full mt-4 text-red-600 hover:text-red-700 font-medium text-sm">
                  Gerenciar estoque →
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
 