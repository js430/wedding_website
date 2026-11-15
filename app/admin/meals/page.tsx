import MealTally from "@/components/MealTally";

export const metadata = {
  title: "Meal counts",
  robots: { index: false, follow: false },
};

export default function MealsPage() {
  return <MealTally />;
}
