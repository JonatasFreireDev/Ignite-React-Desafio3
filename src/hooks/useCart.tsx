import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const hasInCard = updatedCart.find(
        (cartItem) => cartItem.id === productId
      );

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stock.amount;
      const currentAmount = hasInCard ? hasInCard.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (hasInCard) {
        hasInCard.amount = hasInCard.amount + 1;
      } else {
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );
        updatedCart.push({ ...product, amount: 1 });
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasInCart = cart.findIndex((cartItem) => cartItem.id === productId);

      if (hasInCart < 0) throw new Error();

      const newCart = cart.filter((cartItem) => cartItem.id !== productId);

      setCart(newCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err) {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const hasInCard = updatedCart.find((cart) => cart.id === productId);

      if (hasInCard) {
        hasInCard.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      }
    } catch (err) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
