import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Filter, Star, ShoppingCart, Sparkles, TrendingUp, Award, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Home() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSabor, setSelectedSabor] = useState("todos");
  const [selectedCategoria, setSelectedCategoria] = useState("todos");
  const [sortBy, setSortBy] = useState("destaque");
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.log("Usuário não autenticado");
    }
  };

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    initialData: [],
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: () => base44.entities.Wishlist.filter({ cliente_id: user?.id }),
    enabled: !!user,
    initialData: [],
  });

  const adicionarWishlistMutation = useMutation({
    mutationFn: (produto) => base44.entities.Wishlist.create({
      cliente_id: user.id,
      produto_id: produto.id,
      produto_nome: produto.nome,
      produto_preco: produto.preco,
      produto_imagem: produto.imagem_url,
      produto_sabor: produto.sabor
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success("Adicionado à lista de desejos!");
    },
  });

  const removerWishlistMutation = useMutation({
    mutationFn: (wishlistItemId) => base44.entities.Wishlist.delete(wishlistItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success("Removido da lista de desejos");
    },
  });

  const toggleWishlist = (produto) => {
    if (!user) {
      toast.error("Faça login para adicionar à lista de desejos");
      base44.auth.redirectToLogin();
      return;
    }

    const wishlistItem = wishlist.find(item => item.produto_id === produto.id);
    
    if (wishlistItem) {
      removerWishlistMutation.mutate(wishlistItem.id);
    } else {
      adicionarWishlistMutation.mutate(produto);
    }
  };

  const isProdutoNaWishlist = (produtoId) => {
    return wishlist.some(item => item.produto_id === produtoId);
  };

  const adicionarAoCarrinho = (produto) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingItem = cart.find(item => item.produto_id === produto.id);

    if (existingItem) {
      existingItem.quantidade += 1;
      existingItem.subtotal = existingItem.quantidade * existingItem.preco_unitario;
    } else {
      cart.push({
        produto_id: produto.id,
        produto_nome: produto.nome,
        produto_imagem: produto.imagem_url,
        quantidade: 1,
        preco_unitario: produto.preco,
        subtotal: produto.preco
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    toast.success(`${produto.nome} adicionado ao carrinho!`);
  };

  const produtosFiltrados = produtos
    .filter(p => {
      const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSabor = selectedSabor === "todos" || p.sabor === selectedSabor;
      const matchCategoria = selectedCategoria === "todos" || p.categoria === selectedCategoria;
      return matchSearch && matchSabor && matchCategoria && p.estoque > 0;
    })
    .sort((a, b) => {
      if (sortBy === "destaque") return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0);
      if (sortBy === "menor_preco") return a.preco - b.preco;
      if (sortBy === "maior_preco") return b.preco - a.preco;
      return 0;
    });

  const produtosDestaque = produtos.filter(p => p.destaque && p.ativo && p.estoque > 0).slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-teal-500 to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-rose-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Novidade
                </Badge>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Cupcakes Artesanais
                <span className="block text-teal-100">Feitos com Amor</span>
              </h1>
              <p className="text-lg text-teal-50 max-w-xl">
                Descubra sabores únicos e ingredientes premium em cada mordida. 
                Feitos frescos todos os dias especialmente para você.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="bg-white text-teal-600 hover:bg-teal-50"
                  onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver Cardápio
                  <ShoppingCart className="w-5 h-5 ml-2" />
                </Button>
                <Link to={createPageUrl("MeusPedidos")}>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                  >
                    Meus Pedidos
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="hidden md:flex justify-center items-center">
              <div className="relative">
                <div className="w-80 h-80 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center">
                  <span className="text-9xl">🧁</span>
                </div>
                <div className="absolute -top-4 -right-4 bg-rose-400 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                  -20% OFF
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Produtos em Destaque */}
      {produtosDestaque.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Award className="w-6 h-6 text-teal-600" />
            <h2 className="text-3xl font-bold text-gray-900">Destaques da Semana</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {produtosDestaque.map((produto) => (
              <Card key={produto.id} className="group overflow-hidden hover:shadow-2xl transition-all border-2 border-teal-100 relative">
                <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                  {produto.imagem_url ? (
                    <img 
                      src={produto.imagem_url} 
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl">
                      🧁
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge className="bg-rose-500 text-white">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Destaque
                    </Badge>
                  </div>
                  
                  {/* Botão Wishlist */}
                  <button
                    onClick={() => toggleWishlist(produto)}
                    className="absolute top-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all hover:scale-110"
                  >
                    <Heart 
                      className={`w-5 h-5 ${
                        isProdutoNaWishlist(produto.id) 
                          ? 'text-rose-500 fill-current' 
                          : 'text-gray-400'
                      }`} 
                    />
                  </button>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold text-xl text-gray-900 mb-2">{produto.nome}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{produto.descricao}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-teal-600">
                      R$ {produto.preco.toFixed(2)}
                    </span>
                    <Button 
                      onClick={() => adicionarAoCarrinho(produto)}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Catálogo de Produtos */}
      <section id="produtos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Nosso Cardápio</h2>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar cupcakes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSabor} onValueChange={setSelectedSabor}>
              <SelectTrigger>
                <SelectValue placeholder="Sabor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Sabores</SelectItem>
                <SelectItem value="chocolate">Chocolate</SelectItem>
                <SelectItem value="baunilha">Baunilha</SelectItem>
                <SelectItem value="morango">Morango</SelectItem>
                <SelectItem value="red_velvet">Red Velvet</SelectItem>
                <SelectItem value="limao">Limão</SelectItem>
                <SelectItem value="nutella">Nutella</SelectItem>
                <SelectItem value="doce_de_leite">Doce de Leite</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="classico">Clássico</SelectItem>
                <SelectItem value="gourmet">Gourmet</SelectItem>
                <SelectItem value="especial">Especial</SelectItem>
                <SelectItem value="vegano">Vegano</SelectItem>
                <SelectItem value="sem_gluten">Sem Glúten</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="destaque">Destaques</SelectItem>
                <SelectItem value="menor_preco">Menor Preço</SelectItem>
                <SelectItem value="maior_preco">Maior Preço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Produtos */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros ou busque por outro termo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produtosFiltrados.map((produto) => (
              <Card key={produto.id} className="group hover:shadow-xl transition-all overflow-hidden relative">
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                  {produto.imagem_url ? (
                    <img 
                      src={produto.imagem_url} 
                      alt={produto.nome}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      🧁
                    </div>
                  )}
                  
                  {/* Badges e Wishlist */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    {produto.destaque && (
                      <Badge className="bg-rose-500 text-white">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Destaque
                      </Badge>
                    )}
                  </div>
                  
                  {/* Botão Wishlist */}
                  <button
                    onClick={() => toggleWishlist(produto)}
                    className="absolute top-2 left-2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all hover:scale-110"
                  >
                    <Heart 
                      className={`w-5 h-5 ${
                        isProdutoNaWishlist(produto.id) 
                          ? 'text-rose-500 fill-current' 
                          : 'text-gray-400'
                      }`} 
                    />
                  </button>
                  
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="bg-white/90">
                      {produto.categoria?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
                    {produto.nome}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {produto.descricao || `Delicioso cupcake de ${produto.sabor}`}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-teal-600">
                      R$ {produto.preco.toFixed(2)}
                    </span>
                    <Button 
                      onClick={() => adicionarAoCarrinho(produto)}
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
        )}
      </section>

      {/* Benefícios */}
      <section className="bg-gradient-to-br from-teal-50 to-rose-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Ingredientes Premium</h3>
              <p className="text-gray-600 text-sm">
                Usamos apenas ingredientes da mais alta qualidade
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Feitos no Dia</h3>
              <p className="text-gray-600 text-sm">
                Produção diária para garantir frescor
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Entrega Rápida</h3>
              <p className="text-gray-600 text-sm">
                Receba seus cupcakes fresquinhos em casa
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}