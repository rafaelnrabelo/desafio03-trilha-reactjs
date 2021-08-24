import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface ProductResponseProps {
  id: number;
  title: string;
  price: number;
  image: string;
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
      const newCart = cart;
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const productCartIndex = cart.findIndex(
        (product) => product.id === productId
      );
      if (productCartIndex === -1) {
        if (stock.amount >= 1) {
          const { data: product } = await api.get<ProductResponseProps>(
            `/products/${productId}`
          );
          newCart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            amount: 1,
          });
          setCart([...newCart]);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      } else {
        const newAmount = newCart[productCartIndex].amount + 1;
        if (stock.amount >= newAmount) {
          newCart[productCartIndex].amount = newAmount;
          setCart([...newCart]);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );
      if (productIndex === -1) {
        throw new Error();
      }
      const newCart = cart.filter((product) => product.id !== productId);
      setCart([...newCart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
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
      if (stock.amount >= amount) {
        const newCart = cart.map((product) =>
          product.id === productId ? { ...product, amount: amount } : product
        );
        setCart([...newCart]);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
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
