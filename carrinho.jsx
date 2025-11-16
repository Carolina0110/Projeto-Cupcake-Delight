import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, AlertCircle, Package, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function Carrinho() {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [stockWarnings, setStockWarnings] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
    loadUser();
    window.addEventListener("storage", loadCart);
    return () => window.removeEventListener("storage", loadCart);
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.log("Usuário não autenticado");
    }
  };

  const loadCart = () => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);
    checkStock(savedCart);
  };

  // Buscar produtos para verificar estoque
  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    initialData: [],
  });

  const checkStock = (cartItems) => {
    const warnings = {};
    cartItems.forEach(item => {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (produto) {
        if (produto.estoque === 0) {
          warnings[item.produto_id] = "Produto indisponível";
        } else if (item.quantidade > produto.estoque) {
          warnings[item.produto_id] = `Apenas ${produto.estoque} disponível(is)`;
        }
      }
    });
    setStockWarnings(warnings);
  };

  useEffect(() => {
    if (produtos.length > 0) {
      checkStock(cart);
    }
  }, [produtos, cart]);

  const updateQuantidade = (index, delta) => {
    const newCart = [...cart];
    const produto = produtos.find(p => p.id === newCart[index].produto_id);
    
    const newQuantity = newCart[index].quantidade + delta;

    // Validar estoque
    if (produto && newQuantity > produto.estoque) {
      toast.error(`Apenas ${produto.estoque} unidade(s) disponível(is)`);
      return;
    }

    if (newQuantity < 1) {
      toast.error("Quantidade mínima é 1");
      return;
    }

    newCart[index].quantidade = newQuantity;
    newCart[index].subtotal = newCart[index].quantidade * newCart[index].preco_unitario;
    
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("storage"));
    toast.success("Quantidade atualizada");
  };

  const removerItem = (index) => {
    const item = cart[index];
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("storage"));
    toast.success(`${item.produto_nome} removido do carrinho`);
  };

  const limparCarrinho = () => {
    if (confirm("Deseja realmente limpar todo o carrinho?")) {
      setCart([]);
      localStorage.setItem("cart", JSON.stringify([]));
      window.dispatchEvent(new Event("storage"));
      toast.success("Carrinho limpo");
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxaEntrega = subtotal >= 50 ? 0 : 10;
  const desconto = subtotal >= 100 ? subtotal * 0.05 : 0; // 5% de desconto acima de R$ 100
  const total = subtotal + taxaEntrega - desconto;

  const hasStockIssues = Object.keys(stockWarnings).length > 0;

  const finalizarPedido = () => {
    if (cart.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    if (hasStockIssues) {
      toast.error("Há produtos indisponíveis no carrinho. Por favor, remova-os antes de continuar.");
      return;
    }

    if (!user) {
      toast.error("Faça login para continuar");
      base44.auth.redirectToLogin(createPageUrl("Carrinho"));
      return;
    }

    navigate(createPageUrl("Checkout"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Carrinho</h1>
              <p className="text-gray-600">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'} no carrinho
              </p>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={limparCarrinho}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Carrinho
              </Button>
            )}
          </div>

          {/* Alertas de Estoque */}
          {hasStockIssues && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Alguns produtos no seu carrinho estão indisponíveis ou com quantidade limitada. 
                Ajuste as quantidades antes de finalizar.
              </AlertDescription>
            </Alert>
          )}

          {/* Benefícios */}
          {subtotal > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subtotal >= 50 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800">
                    <strong>Frete Grátis</strong> garantido!
                  </p>
                </div>
              )}
              
              {subtotal < 50 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                  <Package className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Faltam <strong>R$ {(50 - subtotal).toFixed(2)}</strong> para frete grátis
                  </p>
                </div>
              )}

              {subtotal >= 100 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <p className="text-sm text-purple-800">
                    <strong>5% de desconto</strong> aplicado!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {cart.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Seu carrinho está vazio
              </h2>
              <p className="text-gray-600 mb-6">
                Adicione alguns cupcakes deliciosos ao seu carrinho!
              </p>
              <Link to={createPageUrl("Home")}>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Package className="w-5 h-5 mr-2" />
                  Ver Produtos
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Items do Carrinho */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item, index) => {
                const hasWarning = stockWarnings[item.produto_id];
                
                return (
                  <Card key={index} className={`overflow-hidden transition-all ${hasWarning ? 'border-red-300 bg-red-50/30' : 'hover:shadow-lg'}`}>
                    <CardContent className="p-0">
                      <div className="flex gap-4 p-4">
                        {/* Imagem */}
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0 relative">
                          {item.produto_imagem ? (
                            <img 
                              src={item.produto_imagem} 
                              alt={item.produto_nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              🧁
                            </div>
                          )}
                          {hasWarning && (
                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                              <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                          )}
                        </div>

                        {/* Detalhes */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 truncate pr-4">
                              {item.produto_nome}
                            </h3>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              onClick={() => removerItem(index)}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>

                          {hasWarning && (
                            <Badge variant="destructive" className="mb-2">
                              {stockWarnings[item.produto_id]}
                            </Badge>
                          )}

                          <p className="text-teal-600 font-bold mb-3">
                            R$ {item.preco_unitario.toFixed(2)} / unidade
                          </p>

                          <div className="flex items-center justify-between">
                            {/* Controles de Quantidade */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9"
                                onClick={() => updateQuantidade(index, -1)}
                                disabled={item.quantidade <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  const produto = produtos.find(p => p.id === item.produto_id);
                                  if (produto && newQty <= produto.estoque) {
                                    const newCart = [...cart];
                                    newCart[index].quantidade = newQty;
                                    newCart[index].subtotal = newQty * item.preco_unitario;
                                    setCart(newCart);
                                    localStorage.setItem("cart", JSON.stringify(newCart));
                                  }
                                }}
                                className="w-16 text-center font-semibold"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-9 w-9"
                                onClick={() => updateQuantidade(index, 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Subtotal */}
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Subtotal</p>
                              <span className="font-bold text-xl text-gray-900">
                                R$ {item.subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Continuar Comprando */}
              <Link to={createPageUrl("Home")}>
                <Button variant="outline" className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  Adicionar Mais Produtos
                </Button>
              </Link>
            </div>

            {/* Resumo do Pedido */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Resumo do Pedido
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'itens'})</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    
                    {desconto > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Desconto (5%)</span>
                        <span>- R$ {desconto.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Taxa de Entrega</span>
                      {taxaEntrega === 0 ? (
                        <span className="text-green-600 font-semibold">Grátis</span>
                      ) : (
                        <span>R$ {taxaEntrega.toFixed(2)}</span>
                      )}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Total</span>
                        <span className="text-teal-600">R$ {total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Benefícios */}
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-teal-900 mb-2">Benefícios:</h3>
                    <ul className="space-y-1 text-sm text-teal-800">
                      {subtotal >= 50 && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Frete Grátis
                        </li>
                      )}
                      {desconto > 0 && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Desconto de 5% aplicado
                        </li>
                      )}
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Entrega garantida
                      </li>
                    </ul>
                  </div>

                  <Button 
                    className="w-full bg-teal-600 hover:bg-teal-700 text-lg py-6"
                    onClick={finalizarPedido}
                    disabled={hasStockIssues}
                  >
                    {hasStockIssues ? (
                      <>
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Corrigir Problemas
                      </>
                    ) : (
                      <>
                        Finalizar Pedido
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-gray-500 mt-3">
                      Você precisará fazer login para continuar
                    </p>
                  )}

                  {/* Segurança */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Compra 100% segura</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}