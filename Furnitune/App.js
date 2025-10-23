import React from "react";
import { NavigationContainer, useRoute } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Screens
import LandingPage from "./app/components/LandingPage";
import ProductPage from "./app/components/ProductPage";
import MenuBar from "./app/components/MenuBar";
import ProductDetails from "./app/components/ProductDetails";
import BottomTabs from "./app/components/BottomTabs";
import LoginPage from "./app/components/LoginPage";
import BestSellerPage from "./app/components/BestSellerPage";
import NewDesignPage from "./app/components/NewDesignPage";
import RoomsPage from "./app/components/RoomsPage";
import CollectionsPage from "./app/components/CollectionPage";
import VisitUs from "./app/components/VisitUs";
import Repair from "./app/components/Repair";
import Customization from "./app/components/Customization";
import Settings from "./app/components/Settings";
import Profile from "./app/components/Profile";
import MyPurchases from "./app/components/MyPurchases";
import SignupScreen from "./app/components/SignupScreen";
import CartPage from "./app/components/CartPage";
import NotificationPage from "./app/components/NotificationPage";
import CustomizationPage from "./app/components/CustomizationPage";
import CheckoutPage from "./app/components/CheckoutPage";
import PaymentPage from "./app/components/PaymentPage";
import ChatbotPage from "./app/components/ChatbotPage";
import RecommenderPage from "./app/components/RecommenderPage";

const Stack = createStackNavigator();

// A wrapper that shows/hides MenuBar & BottomTabs
function LayoutWrapper({ children }) {
  const route = useRoute();

  // Screens where we want to hide nav bars
  const hiddenScreens = ["LoginPage"];

  const shouldHide = hiddenScreens.includes(route.name);

  return (
    <>
      {!shouldHide && <MenuBar />}
      {children}
      {!shouldHide && <BottomTabs />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Landing">
            {(props) => (
              <LayoutWrapper>
                <LandingPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="ChatbotPage">
            {(props) => (
              <LayoutWrapper>
                <ChatbotPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="RecommenderPage">
            {(props) => (
              <LayoutWrapper>
                <RecommenderPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="ProductPage">
            {(props) => (
              <LayoutWrapper>
                <ProductPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="CheckoutPage">
            {(props) => (
              <LayoutWrapper>
                <CheckoutPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

           <Stack.Screen name="CartPage">
            {(props) => (
              <LayoutWrapper>
                <CartPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="PaymentPage">
            {(props) => (
              <LayoutWrapper>
                <PaymentPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="NotificationPage">
            {(props) => (
              <LayoutWrapper>
                <NotificationPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="ProductDetails">
            {(props) => (
              <LayoutWrapper>
                <ProductDetails {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="BestSellerPage">
            {(props) => (
              <LayoutWrapper>
                <BestSellerPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="NewDesignPage">
            {(props) => (
              <LayoutWrapper>
                <NewDesignPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="RoomsPage">
            {(props) => (
              <LayoutWrapper>
                <RoomsPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="VisitUs">
            {(props) => (
              <LayoutWrapper>
                <VisitUs{...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="CollectionsPage">
            {(props) => (
              <LayoutWrapper>
                <CollectionsPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>
          
          <Stack.Screen name="Repair">
            {(props) => (
              <LayoutWrapper>
                <Repair {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="Customization">
            {(props) => (
              <LayoutWrapper>
                <Customization {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="CustomizationPage">
            {(props) => (
              <LayoutWrapper>
                <CustomizationPage {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

           <Stack.Screen name="Settings">
            {(props) => (
              <LayoutWrapper>
                <Settings {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="Profile">
            {(props) => (
              <LayoutWrapper>
                <Profile {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          <Stack.Screen name="MyPurchases">
            {(props) => (
              <LayoutWrapper>
                <MyPurchases {...props} />
              </LayoutWrapper>
            )}
          </Stack.Screen>

          {/* 👇 Login won't render MenuBar or BottomTabs */}
          <Stack.Screen name="LoginPage" component={LoginPage} />
          <Stack.Screen name="SignupScreen" component={SignupScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
} 