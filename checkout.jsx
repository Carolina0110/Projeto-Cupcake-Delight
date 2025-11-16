import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { CreditCard, MapPin, Truck, CheckCircle2, Loader2, AlertCircle, Smartphone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function Checkout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState(1);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const [endereco, setEndereco] = useState({
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "SP",
    cep: ""
  });
  
  const [tipoEntrega, setTipoEntrega] = useState("agendada");
  const [formaPagamento, setFormaPagamento] = useState("cartao");
  const [observacoes, setObservacoes] = useState("");

  // Dados do cartão (apenas para validação visual, não são armazenados)
  const [dadosCartao, setDadosCartao] = useState({
    numero: "",
    nome: "",
    validade: "",
    cvv: ""
  });

  useEffect(() => {
    loadUser();
    loadCart();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Carregar endereço favorito se existir
      if (currentUser.endereco_favorito) {
        setEndereco(currentUser.endereco_favorito);
      }
    } catch (error) {
      toast.error("Você precisa fazer login para continuar");
      base44.auth.redirectToLogin(createPageUrl("Checkout"));
    }
  };

  const loadCart = () => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (savedCart.length === 0) {
      toast.error("Seu carrinho está vazio");
      navigate(createPageUrl("Home"));
      return;
    }
    setCart(savedCart);
  };

  const criarPedidoMutation = useMutation({
    mutationFn: async (dadosPedido) => {
      return await base44.entities.Pedido.create(dadosPedido);
    },
    onSuccess: (pedido) => {
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("storage"));
      toast.success("Pedido realizado com sucesso!");
      
      // Enviar email de confirmação (simulado)
      base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Pedido #${pedido.id.slice(-8)} Confirmado - Cupcakes Gourmet`,
        body: `Olá ${user.full_name},\n\nSeu pedido foi confirmado com sucesso!\n\nNúmero do pedido: #${pedido.id.slice(-8)}\nValor total: R$ ${pedido.total.toFixed(2)}\n\nAcompanhe o status do seu pedido em nossa plataforma.\n\nObrigado pela preferência!\nCupcakes Gourmet`
      }).catch(err => console.log("Erro ao enviar email:", err));
      
      navigate(createPageUrl("MeusPedidos"));
    },
    onError: (error) => {
      toast.error("Erro ao criar pedido. Tente novamente.");
    }
  });

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxaEntrega = tipoEntrega === "expressa" ? 15 : subtotal >= 50 ? 0 : 10;
  const desconto = subtotal >= 100 ? subtotal * 0.05 : 0;
  const total = subtotal + taxaEntrega - desconto;

  const validarEndereco = () => {
    if (!endereco.rua || !endereco.numero || !endereco.bairro || !endereco.cidade || !endereco.cep) {
      toast.error("Preencha todos os campos do endereço");
      return false;
    }

    const cepRegex = /^\d{5}-?\d{3}$/;
    if (!cepRegex.test(endereco.cep)) {
      toast.error("CEP inválido. Use o formato: 12345-678");
      return false;
    }

    return true;
  };

  const validarPagamento = () => {
    if (formaPagamento === "cartao") {
      if (!dadosCartao.numero || !dadosCartao.nome || !dadosCartao.validade || !dadosCartao.cvv) {
        toast.error("Preencha todos os dados do cartão");
        return false;
      }

      // Validar número do cartão (simples)
      if (dadosCartao.numero.replace(/\s/g, '').length < 13) {
        toast.error("Número do cartão inválido");
        return false;
      }

      // Validar validade
      const validadeRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
      if (!validadeRegex.test(dadosCartao.validade)) {
        toast.error("Validade inválida. Use o formato MM/AA");
        return false;
      }

      // Validar CVV
      if (dadosCartao.cvv.length < 3) {
        toast.error("CVV inválido");
        return false;
      }
    }

    return true;
  };

  const simularPagamento = async () => {
    setProcessingPayment(true);
    
    // Simular processamento do pagamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simular sucesso (90% de sucesso)
    const sucesso = Math.random() > 0.1;
    
    setProcessingPayment(false);
    return sucesso;
  };

  const finalizarPedido = async () => {
    if (step === 1) {
      if (!validarEndereco()) return;
      setStep(2);
      return;
    }

    if (!validarPagamento()) return;

    // Simular processamento de pagamento
    const pagamentoAprovado = await simularPagamento();

    if (!pagamentoAprovado) {
      toast.error("Pagamento recusado. Tente novamente ou use outro método.");
      return;
    }

    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    const dadosPedido = {
      cliente_id: user.id,
      cliente_nome: user.full_name,
      cliente_email: user.email,
      itens: cart,
      subtotal,
      taxa_entrega: taxaEntrega,
      total,
      status: "pendente",
      tipo_entrega: tipoEntrega,
      endereco,
      forma_pagamento: formaPagamento,
      pagamento_status: "aprovado",
      observacoes
    };

    criarPedidoMutation.mutate(dadosPedido);
  };

  const formatarCEP = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const formatarCartao = (value) => {
    const numbers = value.replace(/\D/g, '');
    const groups = numbers.match(/.{1,4}/g);
    return groups ? groups.join(' ') : numbers;
  };

  const formatarValidade = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finalizar Pedido</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 text-sm mt-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-teal-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span>Entrega</span>
            </div>
            
            <div className="flex-1 h-1 bg-gray-200 rounded">
              <div className={`h-full rounded transition-all ${step >= 2 ? 'bg-teal-600 w-full' : 'w-0'}`} />
            </div>
            
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-teal-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span>Pagamento</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Endereço de Entrega */}
            {step === 1 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-teal-600" />
                      Endereço de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <Label>CEP *</Label>
                        <Input
                          value={endereco.cep}
                          onChange={(e) => setEndereco({...endereco, cep: formatarCEP(e.target.value)})}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label>Estado *</Label>
                        <Input
                          value={endereco.estado}
                          onChange={(e) => setEndereco({...endereco, estado: e.target.value})}
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Rua *</Label>
                        <Input
                          value={endereco.rua}
                          onChange={(e) => setEndereco({...endereco, rua: e.target.value})}
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label>Número *</Label>
                        <Input
                          value={endereco.numero}
                          onChange={(e) => setEndereco({...endereco, numero: e.target.value})}
                          placeholder="123"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label>Complemento</Label>
                        <Input
                          value={endereco.complemento}
                          onChange={(e) => setEndereco({...endereco, complemento: e.target.value})}
                          placeholder="Apto, bloco, etc."
                        />
                      </div>
                      <div>
                        <Label>Bairro *</Label>
                        <Input
                          value={endereco.bairro}
                          onChange={(e) => setEndereco({...endereco, bairro: e.target.value})}
                          placeholder="Bairro"
                        />
                      </div>
                      <div>
                        <Label>Cidade *</Label>
                        <Input
                          value={endereco.cidade}
                          onChange={(e) => setEndereco({...endereco, cidade: e.target.value})}
                          placeholder="Cidade"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-teal-600" />
                      Tipo de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={tipoEntrega} onValueChange={setTipoEntrega}>
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                        <RadioGroupItem value="agendada" id="agendada" className="mt-1" />
                        <Label htmlFor="agendada" className="flex-1 cursor-pointer">
                          <div className="font-semibold mb-1">Entrega Agendada</div>
                          <div className="text-sm text-gray-600 mb-2">Receba em até 2 dias úteis</div>
                          <div className="text-lg font-bold text-teal-600">
                            {subtotal >= 50 ? "GRÁTIS" : "R$ 10,00"}
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all mt-3">
                        <RadioGroupItem value="expressa" id="expressa" className="mt-1" />
                        <Label htmlFor="expressa" className="flex-1 cursor-pointer">
                          <div className="font-semibold mb-1">Entrega Expressa</div>
                          <div className="text-sm text-gray-600 mb-2">Receba no mesmo dia (raio de 10km)</div>
                          <div className="text-lg font-bold text-teal-600">R$ 15,00</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Pagamento */}
            {step === 2 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-teal-600" />
                      Forma de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={formaPagamento} onValueChange={setFormaPagamento}>
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                        <RadioGroupItem value="cartao" id="cartao" className="mt-1" />
                        <Label htmlFor="cartao" className="flex-1 cursor-pointer">
                          <div className="font-semibold mb-1">Cartão de Crédito</div>
                          <div className="text-sm text-gray-600">Visa, Mastercard, Elo, Amex</div>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all mt-3">
                        <RadioGroupItem value="pix" id="pix" className="mt-1" />
                        <Label htmlFor="pix" className="flex-1 cursor-pointer">
                          <div className="font-semibold mb-1">PIX</div>
                          <div className="text-sm text-gray-600">Aprovação instantânea</div>
                        </Label>
                      </div>
                    </RadioGroup>

                    {/* Formulário de Cartão */}
                    {formaPagamento === "cartao" && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Seus dados de pagamento são protegidos e não serão armazenados.
                          </AlertDescription>
                        </Alert>
                        
                        <div>
                          <Label>Número do Cartão *</Label>
                          <Input
                            value={dadosCartao.numero}
                            onChange={(e) => setDadosCartao({...dadosCartao, numero: formatarCartao(e.target.value)})}
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                          />
                        </div>
                        <div>
                          <Label>Nome no Cartão *</Label>
                          <Input
                            value={dadosCartao.nome}
                            onChange={(e) => setDadosCartao({...dadosCartao, nome: e.target.value.toUpperCase()})}
                            placeholder="NOME IMPRESSO NO CARTÃO"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Validade *</Label>
                            <Input
                              value={dadosCartao.validade}
                              onChange={(e) => setDadosCartao({...dadosCartao, validade: formatarValidade(e.target.value)})}
                              placeholder="MM/AA"
                              maxLength={5}
                            />
                          </div>
                          <div>
                            <Label>CVV *</Label>
                            <Input
                              type="password"
                              value={dadosCartao.cvv}
                              onChange={(e) => setDadosCartao({...dadosCartao, cvv: e.target.value.replace(/\D/g, '')})}
                              placeholder="123"
                              maxLength={4}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {formaPagamento === "pix" && (
                      <Alert className="mt-6">
                        <Smartphone className="h-4 w-4" />
                        <AlertDescription>
                          Após confirmar o pedido, você receberá o QR Code para pagamento via PIX.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Observações (opcional)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Alguma observação especial sobre o pedido?"
                      rows={3}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Resumo */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Itens */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantidade}x {item.produto_nome}
                      </span>
                      <span className="font-medium">
                        R$ {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {desconto > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto (5%)</span>
                      <span>- R$ {desconto.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Entrega</span>
                    {taxaEntrega === 0 ? (
                      <span className="text-green-600 font-semibold">Grátis</span>
                    ) : (
                      <span>R$ {taxaEntrega.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-teal-600">R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {step === 1 ? (
                  <Button 
                    className="w-full bg-teal-600 hover:bg-teal-700 py-6"
                    onClick={finalizarPedido}
                  >
                    Continuar para Pagamento
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-teal-600 hover:bg-teal-700 py-6"
                    onClick={finalizarPedido}
                    disabled={criarPedidoMutation.isPending || processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando Pagamento...
                      </>
                    ) : criarPedidoMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirmar Pedido
                      </>
                    )}
                  </Button>
                )}

                {step === 2 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setStep(1)}
                    disabled={criarPedidoMutation.isPending || processingPayment}
                  >
                    Voltar
                  </Button>
                )}

                {/* Garantias */}
                <div className="pt-4 border-t space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Pagamento 100% seguro</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Dados criptografados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Confirmação por e-mail</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}