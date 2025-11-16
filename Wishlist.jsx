import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, ShoppingCart, Trash2, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Wishlist() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("Wishlist"));
    }
  };

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: () => base44.entities.Wishlist.filter({ cliente_id: user?.id }, "-created_date"),
    enabled: !!user,
    initialData: [],
  });

  const removerDaWishlistMutation = useMutation({
    mutationFn: (itemId) => base44.entities.Wishlist.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success("Removido da lista de desejos");
    },
  });

  const adicionarAoCarrinho = (item) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find(cartItem => cartItem.produto_id === item.produto_id);

    if (existingItem) {
      existingItem.quantidade += 1;
      existingItem.subtotal = existingItem.quantidade * existingItem.preco_unitario;
    } else {
      cart.push({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        produto_imagem: item.produto_imagem,
        quantidade: 1,
        preco_unitario: item.produto_preco,
        subtotal: item.produto_preco
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    toast.success(`${item.produto_nome} adicionado ao carrinho!`);
  };

  const adicionarTodosAoCarrinho = () => {
    wishlistItems.forEach(item => {
      adicionarAoCarrinho(item);
    });
    toast.success("Todos os itens adicionados ao carrinho!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-rose-600 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Minha Lista de Desejos</h1>
              <p className="text-gray-600">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'produto salvo' : 'produtos salvos'}
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-6 bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-rose-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sua lista de desejos está vazia
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Salve seus cupcakes favoritos clicando no ícone de coração nos produtos que você gosta!
              </p>
              <Link to={createPageUrl("Home")}>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Explorar Produtos
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Ações em Massa */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm">
              <p className="text-gray-600 font-medium">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'itens'} na sua lista
              </p>
              <Button 
                onClick={adicionarTodosAoCarrinho}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar Todos ao Carrinho
              </Button>
            </div>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlistItems.map((item) => (
                <Card key={item.id} className="group hover:shadow-xl transition-all overflow-hidden relative">
                  {/* Imagem */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                    {item.produto_imagem ? (
                      <img 
                        src={item.produto_imagem} 
                        alt={item.produto_nome}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        🧁
                      </div>
                    )}
                    
                    {/* Botão Remover */}
                    <button
                      onClick={() => removerDaWishlistMutation.mutate(item.id)}
                      className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all hover:scale-110"
                    >
                      <Heart className="w-5 h-5 text-rose-500 fill-current" />
                    </button>
                  </div>

                  {/* Conteúdo */}
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
                      {item.produto_nome}
                    </h3>
                    {item.produto_sabor && (
                      <p className="text-sm text-gray-600 mb-3 capitalize">
                        {item.produto_sabor.replace(/_/g, ' ')}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-teal-600">
                        R$ {item.produto_preco?.toFixed(2)}
                      </span>
                      <Button 
                        onClick={() => adicionarAoCarrinho(item)}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA para Continuar Comprando */}
            <div className="mt-8 text-center">
              <Link to={createPageUrl("Home")}>
                <Button variant="outline" size="lg" className="group">
                  Continuar Explorando
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
 