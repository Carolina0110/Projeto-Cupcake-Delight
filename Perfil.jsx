import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { User, Mail, Phone, MapPin, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enderecoFavorito, setEnderecoFavorito] = useState({
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setNome(currentUser.full_name || "");
      setTelefone(currentUser.telefone || "");
      setEnderecoFavorito(currentUser.endereco_favorito || {
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: ""
      });
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const atualizarPerfilMutation = useMutation({
    mutationFn: async (dados) => {
      return await base44.auth.updateMe(dados);
    },
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      loadUser();
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil");
    }
  });

  const handleSave = () => {
    atualizarPerfilMutation.mutate({
      full_name: nome,
      telefone,
      endereco_favorito: enderecoFavorito
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais</p>
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <Label>Email</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  O email não pode ser alterado
                </p>
              </div>

              <div>
                <Label>Telefone</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço Favorito */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                Endereço Favorito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>CEP</Label>
                  <Input
                    value={enderecoFavorito.cep}
                    onChange={(e) => setEnderecoFavorito({...enderecoFavorito, cep: e.target.value})}
                    placeholder="00000-000"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Rua</Label>
                  <Input
                    value={enderecoFavorito.rua}
                    onChange={(e) => setEnderecoFavorito({...enderecoFavorito, rua: e.target.value})}
                    placeholder="Nome da rua"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label>Número</Label>
                  <Input
                    value={enderecoFavorito.numero}
                    onChange={(e) => setEnderecoFavorito({...enderecoFavorito, numero: e.target.value})}
                    placeholder="123"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Complemento</Label>
                  <Input
                    value={enderecoFavorito.complemento}
                    onChange={(e) => setEnderecoFavorito({...enderecoFavorito, complemento: e.target.value})}
                    placeholder="Apto, bloco, etc."
                  />
                </div>

                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={enderecoFavorito.bairro}
                    onChange={(e) => setEnderecoFavorito({...enderecoFavorito, bairro: e.target.value})}
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={enderecoFavorito.cidade}
                    onChange={(e) => setEnderecoFavorito({...enderecoFavorito, cidade: e.target.value})}
                    placeholder="Cidade"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 py-6 text-lg"
            onClick={handleSave}
            disabled={atualizarPerfilMutation.isPending}
          >
            {atualizarPerfilMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            )} : 
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Alterações
 